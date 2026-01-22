import { create } from "zustand";
import { persist } from "zustand/middleware";
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

export type Theme = "light" | "dark";

interface MeshState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Show original mesh toggle
  showOriginalMesh: boolean;
  setShowOriginalMesh: (value: boolean) => void;

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

  // Clipping plane for 3D view
  clippingEnabled: boolean;
  clippingPosition: number;
  setClippingEnabled: (value: boolean) => void;
  setClippingPosition: (value: number) => void;

  // Mesh data for each type (before/after)
  meshData: Record<
    MeshType,
    {
      before: MeshData | null;
      after: MeshData | null;
      statsBefore: MeshStats | null;
      statsAfter: MeshStats | null;
      scale: number;
    }
  >;
  setMeshBefore: (type: MeshType, data: MeshData, stats: MeshStats, scale?: number) => void;
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
  hmax: undefined,
  hsiz: undefined,
  hausd: undefined,
  hgrad: undefined,
};

const defaultMeshData = {
  before: null,
  after: null,
  statsBefore: null,
  statsAfter: null,
  scale: 1,
};

export const useMeshStore = create<MeshState>()(
  persist(
    (set) => ({
      // Theme
      theme: "light" as Theme,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),

      // Show original mesh toggle
      showOriginalMesh: false,
      setShowOriginalMesh: (value) => set({ showOriginalMesh: value }),

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

      // Clipping plane for 3D view (enabled by default for MMG3D quality colors)
      clippingEnabled: true,
      clippingPosition: 1.0,
      setClippingEnabled: (value) => set({ clippingEnabled: value }),
      setClippingPosition: (value) => set({ clippingPosition: value }),

      // Mesh data
      meshData: {
        mmg2d: { ...defaultMeshData },
        mmgs: { ...defaultMeshData },
        mmg3d: { ...defaultMeshData },
      },
      setMeshBefore: (type, data, stats, scale) =>
        set((state) => ({
          meshData: {
            ...state.meshData,
            [type]: {
              ...state.meshData[type],
              before: data,
              statsBefore: stats,
              scale: scale ?? state.meshData[type].scale,
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

      // Parameters (all start undefined, defaults computed based on mesh scale)
      params: {
        mmg2d: { ...defaultParams },
        mmgs: { ...defaultParams },
        mmg3d: { ...defaultParams },
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
        colormap: "RdYlBu" as ColormapName,
      },
      setViewerOption: (key, value) =>
        set((state) => ({
          viewerOptions: { ...state.viewerOptions, [key]: value },
        })),
    }),
    {
      name: "mmg-wasm-settings",
      partialize: (state) => ({
        theme: state.theme,
        viewerOptions: state.viewerOptions,
        liveRemesh: state.liveRemesh,
      }),
    }
  )
);
