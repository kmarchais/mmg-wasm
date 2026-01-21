/**
 * TypedArray ↔ WASM heap utilities
 *
 * Standalone utility functions for safely transferring data between
 * JavaScript TypedArrays and the WASM linear memory heap.
 *
 * **Important memory management notes:**
 * - All `toWasm*` functions allocate memory that MUST be freed with `freeWasmArray`
 * - All `fromWasm*` functions return copies, not views, to prevent invalidation on heap growth
 * - After freeing a pointer, do not use it again (use-after-free is undefined behavior)
 */

/**
 * Minimal interface for any Emscripten module with memory operations.
 * This allows the utilities to work with any WASM module (MMG3D, MMGS, MMG2D, etc.)
 */
export interface WasmModule {
  _malloc(size: number): number;
  _free(ptr: number): void;
  HEAPU8: Uint8Array;
  HEAPF64: Float64Array;
  HEAP32: Int32Array;
}

/**
 * Memory statistics for the WASM module.
 *
 * Note: Emscripten doesn't expose precise heap usage tracking.
 * Only total allocated buffer size is available.
 */
export interface MemoryStats {
  /** Total memory buffer size in bytes (not actual usage) */
  totalMemory: number;
}

/**
 * Copy a Float64Array to the WASM heap.
 *
 * @param module - The WASM module instance
 * @param data - The Float64Array to copy
 * @returns Pointer to the allocated memory (0 for empty arrays)
 * @throws Error if memory allocation fails
 *
 * @example
 * ```ts
 * const vertices = new Float64Array([0.0, 0.0, 0.0, 1.0, 0.0, 0.0]);
 * const ptr = toWasmFloat64(module, vertices);
 * try {
 *   // Use ptr with WASM functions
 * } finally {
 *   freeWasmArray(module, ptr);
 * }
 * ```
 */
export function toWasmFloat64(module: WasmModule, data: Float64Array): number {
  if (data.length === 0) {
    return 0;
  }

  const ptr = module._malloc(data.byteLength);
  if (ptr === 0) {
    throw new Error(
      `Failed to allocate ${data.byteLength} bytes (${data.length} Float64 elements)`,
    );
  }

  // Copy data to WASM heap (Float64Array needs 8-byte alignment, which _malloc provides)
  module.HEAPF64.set(data, ptr / 8);
  return ptr;
}

/**
 * Copy an Int32Array to the WASM heap.
 *
 * @param module - The WASM module instance
 * @param data - The Int32Array to copy
 * @returns Pointer to the allocated memory (0 for empty arrays)
 * @throws Error if memory allocation fails
 *
 * @example
 * ```ts
 * const indices = new Int32Array([1, 2, 3, 4]);
 * const ptr = toWasmInt32(module, indices);
 * try {
 *   // Use ptr with WASM functions
 * } finally {
 *   freeWasmArray(module, ptr);
 * }
 * ```
 */
export function toWasmInt32(module: WasmModule, data: Int32Array): number {
  if (data.length === 0) {
    return 0;
  }

  const ptr = module._malloc(data.byteLength);
  if (ptr === 0) {
    throw new Error(
      `Failed to allocate ${data.byteLength} bytes (${data.length} Int32 elements)`,
    );
  }

  // Copy data to WASM heap
  module.HEAP32.set(data, ptr / 4);
  return ptr;
}

/**
 * Copy a Uint32Array to the WASM heap.
 *
 * @param module - The WASM module instance
 * @param data - The Uint32Array to copy
 * @returns Pointer to the allocated memory (0 for empty arrays)
 * @throws Error if memory allocation fails
 *
 * @example
 * ```ts
 * const indices = new Uint32Array([1, 2, 3, 4]);
 * const ptr = toWasmUint32(module, indices);
 * try {
 *   // Use ptr with WASM functions
 * } finally {
 *   freeWasmArray(module, ptr);
 * }
 * ```
 */
export function toWasmUint32(module: WasmModule, data: Uint32Array): number {
  if (data.length === 0) {
    return 0;
  }

  const ptr = module._malloc(data.byteLength);
  if (ptr === 0) {
    throw new Error(
      `Failed to allocate ${data.byteLength} bytes (${data.length} Uint32 elements)`,
    );
  }

  // Copy data to WASM heap (create Uint32Array view since HEAPU32 may not be exported)
  const heapU32 = new Uint32Array(module.HEAPU8.buffer, ptr, data.length);
  heapU32.set(data);
  return ptr;
}

/**
 * Copy Float64 data from the WASM heap to a new Float64Array.
 *
 * @param module - The WASM module instance
 * @param ptr - Pointer to the data in WASM heap
 * @param length - Number of Float64 elements to copy
 * @returns New Float64Array containing the copied data
 *
 * @example
 * ```ts
 * // After a WASM function returns a pointer to float64 data
 * const vertices = fromWasmFloat64(module, dataPtr, numVertices * 3);
 * ```
 */
export function fromWasmFloat64(
  module: WasmModule,
  ptr: number,
  length: number,
): Float64Array {
  if (length === 0 || ptr === 0) {
    return new Float64Array(0);
  }

  // Create a copy of the data (not a view) to prevent invalidation on heap growth
  const result = new Float64Array(length);
  result.set(module.HEAPF64.subarray(ptr / 8, ptr / 8 + length));
  return result;
}

/**
 * Copy Int32 data from the WASM heap to a new Int32Array.
 *
 * @param module - The WASM module instance
 * @param ptr - Pointer to the data in WASM heap
 * @param length - Number of Int32 elements to copy
 * @returns New Int32Array containing the copied data
 *
 * @example
 * ```ts
 * // After a WASM function returns a pointer to int32 data
 * const indices = fromWasmInt32(module, dataPtr, numTetrahedra * 4);
 * ```
 */
export function fromWasmInt32(
  module: WasmModule,
  ptr: number,
  length: number,
): Int32Array {
  if (length === 0 || ptr === 0) {
    return new Int32Array(0);
  }

  // Create a copy of the data (not a view) to prevent invalidation on heap growth
  const result = new Int32Array(length);
  result.set(module.HEAP32.subarray(ptr / 4, ptr / 4 + length));
  return result;
}

/**
 * Copy Uint32 data from the WASM heap to a new Uint32Array.
 *
 * @param module - The WASM module instance
 * @param ptr - Pointer to the data in WASM heap
 * @param length - Number of Uint32 elements to copy
 * @returns New Uint32Array containing the copied data
 *
 * @example
 * ```ts
 * // After a WASM function returns a pointer to uint32 data
 * const indices = fromWasmUint32(module, dataPtr, numElements);
 * ```
 */
export function fromWasmUint32(
  module: WasmModule,
  ptr: number,
  length: number,
): Uint32Array {
  if (length === 0 || ptr === 0) {
    return new Uint32Array(0);
  }

  // Create a copy of the data (not a view) to prevent invalidation on heap growth
  const heapU32 = new Uint32Array(module.HEAPU8.buffer, ptr, length);
  const result = new Uint32Array(length);
  result.set(heapU32);
  return result;
}

/**
 * Free memory allocated on the WASM heap.
 *
 * This function is idempotent: freeing a null pointer (0) is a no-op.
 *
 * **Warning:** After calling this function, the pointer is invalid.
 * Using a freed pointer (use-after-free) causes undefined behavior.
 * Consider setting the pointer variable to 0 after freeing:
 *
 * ```ts
 * freeWasmArray(module, ptr);
 * ptr = 0; // Prevent accidental reuse
 * ```
 *
 * @param module - The WASM module instance
 * @param ptr - Pointer to free (0 is allowed and ignored)
 *
 * @example
 * ```ts
 * const ptr = toWasmFloat64(module, data);
 * try {
 *   // Use ptr
 * } finally {
 *   freeWasmArray(module, ptr); // Always safe to call
 * }
 * ```
 */
export function freeWasmArray(module: WasmModule, ptr: number): void {
  if (ptr !== 0) {
    module._free(ptr);
  }
}

/**
 * Get memory statistics for the WASM module.
 *
 * Note: Emscripten doesn't expose precise heap usage, so only the total
 * memory buffer size is available. This represents the allocated buffer
 * size, not actual memory in use.
 *
 * @param module - The WASM module instance
 * @returns Memory statistics
 *
 * @example
 * ```ts
 * const stats = getMemoryStats(module);
 * console.log(`Total buffer: ${stats.totalMemory} bytes`);
 * ```
 */
export function getMemoryStats(module: WasmModule): MemoryStats {
  return {
    totalMemory: module.HEAPU8.byteLength,
  };
}
