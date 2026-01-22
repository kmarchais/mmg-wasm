import { create } from "zustand";
import type {
  MeshType,
  MeshData,
  MeshStats,
  RemeshParams,
  ViewerOptions,
  LoadingStatus,
  StatusMessage,
  ColormapName,
} from "@/types/mesh";

interface MeshState {
  // Active mesh type
  activeMeshType: MeshType;
  setActiveMeshType: (type: MeshType) => void;

  // WASM module status
  wasmStatus: LoadingStatus;
  setWasmStatus: (status: LoadingStatus) => void;

  // Status message
  statusMessage: StatusMessage | null;
  setStatusMessage: (msg: StatusMessage | null) => void;

  // Remeshing state
  isRemeshing: boolean;
  setIsRemeshing: (value: boolean) => void;
  liveRemesh: boolean;
  setLiveRemesh: (value: boolean) => void;

  // Mesh data for each type (before/after)
  meshData: Record<
    MeshType,
    {
      before: MeshData | null;
      after: MeshData | null;
      statsBefore: MeshStats | null;
      statsAfter: MeshStats | null;
    }
  >;
  setMeshBefore: (type: MeshType, data: MeshData, stats: MeshStats) => void;
  setMeshAfter: (type: MeshType, data: MeshData, stats: MeshStats) => void;
  clearMeshAfter: (type: MeshType) => void;

  // Remeshing parameters per mesh type
  params: Record<MeshType, RemeshParams>;
  setParams: (type: MeshType, params: Partial<RemeshParams>) => void;

  // Viewer options
  viewerOptions: ViewerOptions;
  setViewerOption: <K extends keyof ViewerOptions>(
    key: K,
    value: ViewerOptions[K]
  ) => void;
}

const defaultParams: RemeshParams = {
  hmin: undefined,
  hmax: 0.15,
  hsiz: undefined,
  hausd: undefined,
  hgrad: undefined,
};

const defaultMeshData = {
  before: null,
  after: null,
  statsBefore: null,
  statsAfter: null,
};

export const useMeshStore = create<MeshState>((set) => ({
  // Active mesh type
  activeMeshType: "mmg2d",
  setActiveMeshType: (type) => set({ activeMeshType: type }),

  // WASM status
  wasmStatus: "idle",
  setWasmStatus: (status) => set({ wasmStatus: status }),

  // Status message
  statusMessage: null,
  setStatusMessage: (msg) => set({ statusMessage: msg }),

  // Remeshing state
  isRemeshing: false,
  setIsRemeshing: (value) => set({ isRemeshing: value }),
  liveRemesh: true,
  setLiveRemesh: (value) => set({ liveRemesh: value }),

  // Mesh data
  meshData: {
    mmg2d: { ...defaultMeshData },
    mmgs: { ...defaultMeshData },
    mmg3d: { ...defaultMeshData },
  },
  setMeshBefore: (type, data, stats) =>
    set((state) => ({
      meshData: {
        ...state.meshData,
        [type]: {
          ...state.meshData[type],
          before: data,
          statsBefore: stats,
        },
      },
    })),
  setMeshAfter: (type, data, stats) =>
    set((state) => ({
      meshData: {
        ...state.meshData,
        [type]: {
          ...state.meshData[type],
          after: data,
          statsAfter: stats,
        },
      },
    })),
  clearMeshAfter: (type) =>
    set((state) => ({
      meshData: {
        ...state.meshData,
        [type]: {
          ...state.meshData[type],
          after: null,
          statsAfter: null,
        },
      },
    })),

  // Parameters
  params: {
    mmg2d: { ...defaultParams, hmax: 0.15 },
    mmgs: { ...defaultParams, hmax: 0.25 },
    mmg3d: { ...defaultParams, hmax: 0.3 },
  },
  setParams: (type, params) =>
    set((state) => ({
      params: {
        ...state.params,
        [type]: { ...state.params[type], ...params },
      },
    })),

  // Viewer options
  viewerOptions: {
    showWireframe: true,
    showVertices: true,
    showFaces: true,
    qualityMetric: null,
    colormap: "RdYlBu_r" as ColormapName,
  },
  setViewerOption: (key, value) =>
    set((state) => ({
      viewerOptions: { ...state.viewerOptions, [key]: value },
    })),
}));
