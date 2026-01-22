export type MeshType = "mmg2d" | "mmgs" | "mmg3d";

export interface MeshData {
  vertices: Float64Array;
  triangles?: Int32Array;
  tetrahedra?: Int32Array;
  edges?: Int32Array;
  quality?: Float64Array;
  refs?: {
    vertices?: Int32Array;
    triangles?: Int32Array;
    tetrahedra?: Int32Array;
    edges?: Int32Array;
  };
}

export interface MeshStats {
  nVertices: number;
  nTriangles: number;
  nTetrahedra: number;
  nEdges: number;
  nQuads?: number;
  nPrisms?: number;
}

export interface RemeshParams {
  hmin?: number;
  hmax?: number;
  hsiz?: number;
  hausd?: number;
  hgrad?: number;
}

export type ColormapName =
  | "RdYlBu"
  | "viridis"
  | "plasma"
  | "coolwarm"
  | "jet";

export type QualityMetric = "mmgQuality";

export interface ViewerOptions {
  showWireframe: boolean;
  showVertices: boolean;
  showFaces: boolean;
  qualityMetric: QualityMetric | null;
  colormap: ColormapName;
}

export interface MeshFile {
  name: string;
  content: Uint8Array;
  type: "mesh" | "meshb" | "sol";
}

export type LoadingStatus = "idle" | "loading" | "ready" | "error";

export interface StatusMessage {
  type: "info" | "success" | "warning" | "error";
  message: string;
}
