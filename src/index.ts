// mmg-wasm TypeScript bindings
// This file will export the mmg WASM module interface

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
