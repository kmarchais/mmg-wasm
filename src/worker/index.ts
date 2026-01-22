/**
 * Web Worker API for non-blocking mesh remeshing
 *
 * Provides MeshWorker class and remeshInWorker helper for background remeshing.
 */

import { Mesh, type MeshData } from "../mesh";
import type { RemeshOptions } from "../options";
import type { RemeshResult } from "../result";
import type {
  ProgressInfo,
  SerializedMeshData,
  SerializedRemeshResult,
  WorkerRequestMessage,
  WorkerResponseMessage,
} from "./types";

// Re-export types
export type { ProgressInfo } from "./types";

/**
 * Pending operation tracking
 */
interface PendingOperation {
  resolve: (result: RemeshResult) => void;
  reject: (error: Error) => void;
}

/**
 * Generate a unique ID for operations
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Serialize a Mesh instance for transfer to worker
 */
function serializeMesh(mesh: Mesh): SerializedMeshData {
  const data: SerializedMeshData = {
    vertices: mesh.vertices.slice(), // Copy to avoid transfer issues
    cells: mesh.cells.slice(),
    type: mesh.type,
  };

  if (mesh.nBoundaryFaces > 0) {
    data.boundaryFaces = mesh.boundaryFaces.slice();
  }

  return data;
}

/**
 * Deserialize worker result to RemeshResult
 */
function deserializeResult(serialized: SerializedRemeshResult): RemeshResult {
  // Create a Mesh from the serialized data
  const meshData: MeshData = {
    vertices: serialized.mesh.vertices,
    cells: serialized.mesh.cells,
    type: serialized.mesh.type,
    boundaryFaces: serialized.mesh.boundaryFaces,
    vertexRefs: serialized.mesh.vertexRefs,
    cellRefs: serialized.mesh.cellRefs,
  };

  const mesh = new Mesh(meshData);

  return {
    mesh,
    nVertices: serialized.nVertices,
    nCells: serialized.nCells,
    nBoundaryFaces: serialized.nBoundaryFaces,
    elapsed: serialized.elapsed,
    qualityBefore: serialized.qualityBefore,
    qualityAfter: serialized.qualityAfter,
    qualityImprovement: serialized.qualityImprovement,
    nInserted: serialized.nInserted,
    nDeleted: serialized.nDeleted,
    nSwapped: serialized.nSwapped,
    nMoved: serialized.nMoved,
    success: serialized.success,
    warnings: serialized.warnings,
  };
}

/**
 * MeshWorker - Manages a Web Worker for background remeshing
 *
 * Use this class when you need to perform multiple remeshing operations
 * without blocking the main thread. The worker is reused across operations.
 *
 * @example
 * ```typescript
 * import { MeshWorker } from 'mmg-wasm/worker';
 *
 * // Create worker
 * const worker = new MeshWorker();
 *
 * // Optional: Set up progress callback
 * worker.onProgress = (progress) => {
 *   console.log(`${progress.percent}%: ${progress.stage}`);
 * };
 *
 * // Perform non-blocking remesh
 * const result = await worker.remesh(mesh, { hmax: 0.1 });
 *
 * // Reuse for more operations
 * const result2 = await worker.remesh(anotherMesh, { hmax: 0.2 });
 *
 * // Clean up when done
 * worker.terminate();
 * ```
 */
export class MeshWorker {
  private worker: Worker;
  private pending = new Map<string, PendingOperation>();
  private ready: Promise<void>;
  private terminated = false;

  /**
   * Progress callback for all operations
   *
   * Called with progress updates during remeshing.
   * Set to undefined to disable progress reporting.
   */
  onProgress?: (progress: ProgressInfo) => void;

  /**
   * Create a new MeshWorker
   *
   * The worker is initialized lazily and ready to accept remesh requests
   * after construction completes.
   */
  constructor() {
    // Create worker from the bundled worker script
    this.worker = new Worker(new URL("./remesh.worker.ts", import.meta.url), {
      type: "module",
    });

    // Set up message handler
    this.worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
      this.handleMessage(event.data);
    };

    // Set up error handler
    this.worker.onerror = (event) => {
      // Reject all pending operations
      const error = new Error(event.message || "Worker error");
      for (const [id, operation] of this.pending) {
        operation.reject(error);
        this.pending.delete(id);
      }
    };

    // Wait for ready message
    this.ready = new Promise<void>((resolve) => {
      const checkReady = (event: MessageEvent<WorkerResponseMessage>) => {
        if (event.data.type === "ready") {
          resolve();
        }
      };
      this.worker.addEventListener("message", checkReady, { once: true });
    });
  }

  /**
   * Handle messages from the worker
   */
  private handleMessage(message: WorkerResponseMessage): void {
    switch (message.type) {
      case "result": {
        const operation = this.pending.get(message.id);
        if (operation) {
          try {
            const result = deserializeResult(message.payload);
            operation.resolve(result);
          } catch (error) {
            operation.reject(
              error instanceof Error ? error : new Error(String(error)),
            );
          }
          this.pending.delete(message.id);
        }
        break;
      }

      case "progress": {
        this.onProgress?.(message.payload);
        break;
      }

      case "error": {
        const operation = this.pending.get(message.id);
        if (operation) {
          const error = new Error(message.payload.message);
          if (message.payload.stack) {
            error.stack = message.payload.stack;
          }
          operation.reject(error);
          this.pending.delete(message.id);
        }
        break;
      }

      case "ready":
        // Handled in constructor
        break;
    }
  }

  /**
   * Remesh a mesh in the worker thread
   *
   * The mesh data is transferred to the worker, remeshed, and the result
   * is returned. The original mesh is not modified.
   *
   * @param mesh - Mesh to remesh
   * @param options - Remeshing options
   * @returns Promise resolving to RemeshResult
   * @throws Error if worker has been terminated or remeshing fails
   */
  async remesh(mesh: Mesh, options?: RemeshOptions): Promise<RemeshResult> {
    if (this.terminated) {
      throw new Error("Worker has been terminated");
    }

    // Wait for worker to be ready
    await this.ready;

    const id = generateId();

    // Serialize mesh data
    const meshData = serializeMesh(mesh);

    return new Promise<RemeshResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      // Prepare transferable buffers
      const transferables: Transferable[] = [
        meshData.vertices.buffer,
        meshData.cells.buffer,
      ];
      if (meshData.boundaryFaces) {
        transferables.push(meshData.boundaryFaces.buffer);
      }

      // Send remesh request
      const message: WorkerRequestMessage = {
        type: "remesh",
        id,
        payload: { meshData, options },
      };

      this.worker.postMessage(message, transferables);
    });
  }

  /**
   * Cancel the current operation
   *
   * If an operation is in progress, it will be aborted and the promise
   * will reject with a cancellation error.
   */
  cancel(): void {
    if (this.terminated) {
      return;
    }

    const message: WorkerRequestMessage = {
      type: "cancel",
    };

    this.worker.postMessage(message);
  }

  /**
   * Terminate the worker
   *
   * After calling this method, the worker cannot be used for new operations.
   * Any pending operations will be rejected.
   */
  terminate(): void {
    if (this.terminated) {
      return;
    }

    this.terminated = true;

    // Reject all pending operations
    const error = new Error("Worker terminated");
    for (const [id, operation] of this.pending) {
      operation.reject(error);
      this.pending.delete(id);
    }

    this.worker.terminate();
  }

  /**
   * Check if the worker has been terminated
   */
  get isTerminated(): boolean {
    return this.terminated;
  }
}

/**
 * One-shot helper for remeshing in a worker
 *
 * Creates a worker, performs the remesh, and terminates the worker.
 * Use this for single remeshing operations where you don't need
 * to reuse the worker.
 *
 * For multiple operations, use MeshWorker directly to avoid
 * the overhead of creating/destroying workers.
 *
 * @param mesh - Mesh to remesh
 * @param options - Remeshing options
 * @returns Promise resolving to RemeshResult
 *
 * @example
 * ```typescript
 * import { remeshInWorker } from 'mmg-wasm/worker';
 *
 * const result = await remeshInWorker(mesh, { hmax: 0.1 });
 * console.log(`Remeshed to ${result.nVertices} vertices`);
 * ```
 */
export async function remeshInWorker(
  mesh: Mesh,
  options?: RemeshOptions,
): Promise<RemeshResult> {
  const worker = new MeshWorker();
  try {
    return await worker.remesh(mesh, options);
  } finally {
    worker.terminate();
  }
}
