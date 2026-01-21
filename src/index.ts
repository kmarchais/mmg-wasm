// mmg-wasm TypeScript bindings
// This file exports the mmg WASM module interface

// Export MMG3D bindings
export {
  initMMG3D,
  getWasmModule,
  MMG3D,
  IPARAM,
  DPARAM,
  MMG_RETURN_CODES,
  type MeshHandle,
  type MeshSize,
  type IParamKey,
  type DParamKey,
  type MMG3DModule,
} from "./mmg3d";

// Export memory utilities
export {
  toWasmFloat64,
  toWasmInt32,
  toWasmUint32,
  fromWasmFloat64,
  fromWasmInt32,
  fromWasmUint32,
  freeWasmArray,
  getMemoryStats,
  type WasmModule,
  type MemoryStats,
} from "./memory";

// Legacy interface (for backwards compatibility)
export interface MmgModule {
  mmg_version(): string;
  mmgwasm_version(): string;
  mmg_test_init(): number;
}

export async function loadMmg(): Promise<MmgModule> {
  // TODO: Load and initialize the WASM module
  throw new Error("Not implemented");
}

export default loadMmg;
