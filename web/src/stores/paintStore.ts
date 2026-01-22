import type { MeshType } from "@/types/mesh";
import { create } from "zustand";

export interface BrushSettings {
  /** Brush radius as fraction of mesh diagonal (0.01 to 0.5) */
  radius: number;
  /** Target edge size (smaller = finer mesh) */
  targetSize: number;
  /** Falloff type: hard edge or smooth gradient */
  falloff: "hard" | "smooth";
  /** Blend strength for smooth falloff (0.0 to 1.0) */
  strength: number;
}

interface PaintState {
  /** Whether paint mode is active */
  paintModeEnabled: boolean;
  /** Toggle paint mode */
  setPaintModeEnabled: (enabled: boolean) => void;

  /** Brush settings */
  brushSettings: BrushSettings;
  /** Update brush settings */
  setBrushSettings: (settings: Partial<BrushSettings>) => void;

  /** Size field per vertex per mesh type */
  sizeFields: Record<MeshType, Float64Array | null>;
  /** Set size field for a mesh type */
  setSizeField: (meshType: MeshType, field: Float64Array | null) => void;
  /** Clear size field for a mesh type */
  clearSizeField: (meshType: MeshType) => void;
  /** Clear all size fields */
  clearAllSizeFields: () => void;

  /** Whether size field visualization is enabled */
  showSizeField: boolean;
  /** Toggle size field visualization */
  setShowSizeField: (show: boolean) => void;

  /** Whether user is currently painting (mouse down) */
  isPainting: boolean;
  /** Set painting state */
  setIsPainting: (painting: boolean) => void;
}

const defaultBrushSettings: BrushSettings = {
  radius: 0.1,
  targetSize: 0.05,
  falloff: "smooth",
  strength: 0.5,
};

export const usePaintStore = create<PaintState>()((set) => ({
  paintModeEnabled: false,
  setPaintModeEnabled: (enabled) => set({ paintModeEnabled: enabled }),

  brushSettings: { ...defaultBrushSettings },
  setBrushSettings: (settings) =>
    set((state) => ({
      brushSettings: { ...state.brushSettings, ...settings },
    })),

  sizeFields: {
    mmg2d: null,
    mmgs: null,
    mmg3d: null,
  },
  setSizeField: (meshType, field) =>
    set((state) => ({
      sizeFields: { ...state.sizeFields, [meshType]: field },
    })),
  clearSizeField: (meshType) =>
    set((state) => ({
      sizeFields: { ...state.sizeFields, [meshType]: null },
    })),
  clearAllSizeFields: () =>
    set({
      sizeFields: { mmg2d: null, mmgs: null, mmg3d: null },
    }),

  showSizeField: true,
  setShowSizeField: (show) => set({ showSizeField: show }),

  isPainting: false,
  setIsPainting: (painting) => set({ isPainting: painting }),
}));
