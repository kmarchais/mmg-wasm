/**
 * Worker message types for Web Worker communication
 *
 * Defines the protocol for main thread <-> worker communication
 */

import type { MeshType } from "../mesh";
import type { RemeshOptions } from "../options";

/**
 * Serializable mesh data for worker transfer
 *
 * Unlike Mesh class, this can be sent via postMessage with Transferable support
 */
export interface SerializedMeshData {
  /** Flattened vertex coordinates */
  vertices: Float64Array;
  /** Flattened cell indices (1-indexed) */
  cells: Int32Array;
  /** Mesh type (2d, 3d, surface) */
  type: MeshType;
  /** Optional boundary faces/edges */
  boundaryFaces?: Int32Array;
  /** Optional vertex references */
  vertexRefs?: Int32Array;
  /** Optional cell references */
  cellRefs?: Int32Array;
}

/**
 * Serialized remesh result for worker transfer
 */
export interface SerializedRemeshResult {
  /** Remeshed mesh data */
  mesh: SerializedMeshData;
  /** Number of vertices */
  nVertices: number;
  /** Number of cells */
  nCells: number;
  /** Number of boundary faces */
  nBoundaryFaces: number;
  /** Elapsed time in milliseconds */
  elapsed: number;
  /** Quality before remeshing */
  qualityBefore: number;
  /** Quality after remeshing */
  qualityAfter: number;
  /** Quality improvement ratio */
  qualityImprovement: number;
  /** Vertices inserted */
  nInserted: number;
  /** Vertices deleted */
  nDeleted: number;
  /** Edges/faces swapped (always 0) */
  nSwapped: number;
  /** Vertices moved (always 0) */
  nMoved: number;
  /** Success status */
  success: boolean;
  /** Warning messages */
  warnings: string[];
}

/**
 * Progress information during remeshing
 */
export interface ProgressInfo {
  /** Progress percentage (0-100) */
  percent: number;
  /** Current stage description */
  stage: string;
}

// =====================
// Message types: Main -> Worker
// =====================

export interface RemeshMessage {
  type: "remesh";
  id: string;
  payload: {
    meshData: SerializedMeshData;
    options?: RemeshOptions;
  };
}

export interface CancelMessage {
  type: "cancel";
  id?: string;
}

export type WorkerRequestMessage = RemeshMessage | CancelMessage;

// =====================
// Message types: Worker -> Main
// =====================

export interface ResultMessage {
  type: "result";
  id: string;
  payload: SerializedRemeshResult;
}

export interface ProgressMessage {
  type: "progress";
  id: string;
  payload: ProgressInfo;
}

export interface ErrorMessage {
  type: "error";
  id: string;
  payload: {
    message: string;
    stack?: string;
  };
}

export interface ReadyMessage {
  type: "ready";
}

export type WorkerResponseMessage =
  | ResultMessage
  | ProgressMessage
  | ErrorMessage
  | ReadyMessage;
