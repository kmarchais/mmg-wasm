/**
 * Web Worker for non-blocking mesh remeshing
 *
 * This worker runs remeshing operations in a background thread
 * to prevent blocking the main UI thread.
 */

import { Mesh, MeshType } from "../mesh";
import { initMMG2D } from "../mmg2d";
import { initMMG3D } from "../mmg3d";
import { initMMGS } from "../mmgs";
import type {
  ProgressInfo,
  SerializedMeshData,
  SerializedRemeshResult,
  WorkerRequestMessage,
  WorkerResponseMessage,
} from "./types";

// Track which modules are initialized
let mmg2dReady = false;
let mmg3dReady = false;
let mmgsReady = false;

// Current operation ID for cancellation
let currentOperationId: string | null = null;
let cancelled = false;

/**
 * Initialize the appropriate MMG module
 */
async function ensureModuleReady(type: MeshType): Promise<void> {
  switch (type) {
    case MeshType.Mesh2D:
      if (!mmg2dReady) {
        await initMMG2D();
        mmg2dReady = true;
      }
      break;
    case MeshType.Mesh3D:
      if (!mmg3dReady) {
        await initMMG3D();
        mmg3dReady = true;
      }
      break;
    case MeshType.MeshS:
      if (!mmgsReady) {
        await initMMGS();
        mmgsReady = true;
      }
      break;
  }
}

/**
 * Send a message back to the main thread
 */
function postResponse(
  message: WorkerResponseMessage,
  transfer?: ArrayBuffer[],
): void {
  if (transfer && transfer.length > 0) {
    // Cast to any to handle Bun vs browser type differences
    (self.postMessage as (msg: unknown, transfer: ArrayBuffer[]) => void)(
      message,
      transfer,
    );
  } else {
    self.postMessage(message);
  }
}

/**
 * Send progress update
 */
function sendProgress(id: string, progress: ProgressInfo): void {
  postResponse({
    type: "progress",
    id,
    payload: progress,
  });
}

/**
 * Serialize a Mesh instance to transferable data
 */
function serializeMesh(mesh: Mesh): SerializedMeshData {
  return {
    vertices: mesh.vertices,
    cells: mesh.cells,
    type: mesh.type,
    boundaryFaces: mesh.nBoundaryFaces > 0 ? mesh.boundaryFaces : undefined,
  };
}

/**
 * Handle remesh request
 *
 * Cancellation is cooperative: the `cancelled` flag is only checked between
 * JavaScript stages (module init, mesh creation, post-remesh extraction).
 * Once the WASM remeshing computation begins (`mesh.remesh()`), it cannot
 * be interrupted until it returns.
 */
async function handleRemesh(
  id: string,
  meshData: SerializedMeshData,
  options?: import("../options").RemeshOptions,
): Promise<void> {
  currentOperationId = id;
  cancelled = false;

  try {
    // Progress: Initializing
    sendProgress(id, { percent: 0, stage: "Initializing module" });

    // Ensure the appropriate module is loaded
    await ensureModuleReady(meshData.type);

    if (cancelled) {
      throw new Error("Operation cancelled");
    }

    // Progress: Creating mesh
    sendProgress(id, { percent: 10, stage: "Creating mesh" });

    // Create mesh from serialized data
    const mesh = new Mesh({
      vertices: meshData.vertices,
      cells: meshData.cells,
      type: meshData.type,
      boundaryFaces: meshData.boundaryFaces,
      vertexRefs: meshData.vertexRefs,
      cellRefs: meshData.cellRefs,
    });

    if (cancelled) {
      mesh.free();
      throw new Error("Operation cancelled");
    }

    // Progress: Remeshing
    sendProgress(id, { percent: 20, stage: "Remeshing" });

    // Perform remeshing
    const result = await mesh.remesh(options);

    if (cancelled) {
      result.mesh.free();
      mesh.free();
      throw new Error("Operation cancelled");
    }

    // Progress: Extracting result
    sendProgress(id, { percent: 90, stage: "Extracting result" });

    // Serialize the result mesh
    const serializedResult: SerializedRemeshResult = {
      mesh: serializeMesh(result.mesh),
      nVertices: result.nVertices,
      nCells: result.nCells,
      nBoundaryFaces: result.nBoundaryFaces,
      elapsed: result.elapsed,
      qualityBefore: result.qualityBefore,
      qualityAfter: result.qualityAfter,
      qualityImprovement: result.qualityImprovement,
      nInserted: result.nInserted,
      nDeleted: result.nDeleted,
      nSwapped: result.nSwapped,
      nMoved: result.nMoved,
      success: result.success,
      warnings: result.warnings,
    };

    // Collect transferable buffers
    const transferables: ArrayBuffer[] = [
      serializedResult.mesh.vertices.buffer as ArrayBuffer,
      serializedResult.mesh.cells.buffer as ArrayBuffer,
    ];
    if (serializedResult.mesh.boundaryFaces) {
      transferables.push(
        serializedResult.mesh.boundaryFaces.buffer as ArrayBuffer,
      );
    }

    // Clean up original mesh (result.mesh ownership transferred via serialization)
    result.mesh.free();
    mesh.free();

    // Progress: Complete
    sendProgress(id, { percent: 100, stage: "Complete" });

    // Send result with buffer transfer
    postResponse(
      {
        type: "result",
        id,
        payload: serializedResult,
      },
      transferables,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    postResponse({
      type: "error",
      id,
      payload: {
        message: errorMessage,
        stack: errorStack,
      },
    });
  } finally {
    currentOperationId = null;
  }
}

/**
 * Handle cancel request
 *
 * If `id` is `undefined`, cancels whatever operation is currently running.
 * If `id` matches the current operation, cancels that specific operation.
 */
function handleCancel(id?: string): void {
  if (id === undefined || id === currentOperationId) {
    cancelled = true;
  }
}

/**
 * Main message handler
 */
self.onmessage = async (event: MessageEvent<WorkerRequestMessage>) => {
  const message = event.data;

  switch (message.type) {
    case "remesh":
      await handleRemesh(
        message.id,
        message.payload.meshData,
        message.payload.options,
      );
      break;

    case "cancel":
      handleCancel(message.id);
      break;
  }
};

// Signal that the worker is ready
postResponse({ type: "ready" });
