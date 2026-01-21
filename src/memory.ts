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
 * Tracks both the WASM heap size and allocations made through mmg-wasm utilities.
 * Note: heapUsed only tracks JS-side allocations (toWasm* functions), not MMG's internal C mallocs.
 */
export interface MemoryStats {
  /** Current WASM heap buffer size in bytes */
  heapSize: number;
  /** Approximate bytes allocated through mmg-wasm utilities */
  heapUsed: number;
  /** Approximate bytes available (heapSize - heapUsed) */
  heapFree: number;
  /** Maximum heap size allowed (default: 2GB for 32-bit WASM) */
  heapMax: number;
  /** Percentage of heapMax used (heapUsed / heapMax * 100) */
  usagePercent: number;
}

/**
 * Configuration for memory tracking and limits.
 */
export interface MemoryConfig {
  /** Warn when usage exceeds this percentage (default: 0.8 = 80%) */
  warnThreshold: number;
  /** Throw error when usage exceeds this percentage (default: 0.95 = 95%) */
  errorThreshold: number;
  /** Enable verbose memory logging (default: false) */
  verbose: boolean;
}

/**
 * Error thrown when memory allocation would exceed configured thresholds.
 */
export class MemoryError extends Error {
  constructor(
    message: string,
    public readonly requested: number,
    public readonly available: number,
    public readonly stats: MemoryStats,
  ) {
    super(message);
    this.name = "MemoryError";
  }
}

// Internal allocation tracking (not exported)
interface AllocationRecord {
  size: number;
  type: "float64" | "int32" | "uint32";
}

interface AllocationTracker {
  allocations: Map<number, AllocationRecord>;
  totalAllocated: number;
  config: MemoryConfig;
}

const DEFAULT_CONFIG: MemoryConfig = {
  warnThreshold: 0.8,
  errorThreshold: 0.95,
  verbose: false,
};

const DEFAULT_HEAP_MAX = 2 * 1024 * 1024 * 1024; // 2GB

const trackers = new WeakMap<WasmModule, AllocationTracker>();

function getOrCreateTracker(module: WasmModule): AllocationTracker {
  let tracker = trackers.get(module);
  if (!tracker) {
    tracker = {
      allocations: new Map(),
      totalAllocated: 0,
      config: { ...DEFAULT_CONFIG },
    };
    trackers.set(module, tracker);
  }
  return tracker;
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

  const tracker = getOrCreateTracker(module);
  const byteLength = data.byteLength;

  const ptr = module._malloc(byteLength);
  if (ptr === 0) {
    throw new Error(
      `Failed to allocate ${byteLength} bytes (${data.length} Float64 elements)`,
    );
  }

  // Track allocation
  tracker.allocations.set(ptr, { size: byteLength, type: "float64" });
  tracker.totalAllocated += byteLength;

  // Verbose logging
  if (tracker.config.verbose) {
    console.log(
      `[mmg-wasm] Allocated ${byteLength} bytes (Float64[${data.length}]), ` +
        `total: ${tracker.totalAllocated} bytes`,
    );
  }

  // Warning check
  const usagePercent = tracker.totalAllocated / DEFAULT_HEAP_MAX;
  if (usagePercent >= tracker.config.warnThreshold) {
    console.warn(
      `[mmg-wasm] Memory usage at ${(usagePercent * 100).toFixed(1)}% ` +
        `(${tracker.totalAllocated} / ${DEFAULT_HEAP_MAX} bytes)`,
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

  const tracker = getOrCreateTracker(module);
  const byteLength = data.byteLength;

  const ptr = module._malloc(byteLength);
  if (ptr === 0) {
    throw new Error(
      `Failed to allocate ${byteLength} bytes (${data.length} Int32 elements)`,
    );
  }

  // Track allocation
  tracker.allocations.set(ptr, { size: byteLength, type: "int32" });
  tracker.totalAllocated += byteLength;

  // Verbose logging
  if (tracker.config.verbose) {
    console.log(
      `[mmg-wasm] Allocated ${byteLength} bytes (Int32[${data.length}]), ` +
        `total: ${tracker.totalAllocated} bytes`,
    );
  }

  // Warning check
  const usagePercent = tracker.totalAllocated / DEFAULT_HEAP_MAX;
  if (usagePercent >= tracker.config.warnThreshold) {
    console.warn(
      `[mmg-wasm] Memory usage at ${(usagePercent * 100).toFixed(1)}% ` +
        `(${tracker.totalAllocated} / ${DEFAULT_HEAP_MAX} bytes)`,
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

  const tracker = getOrCreateTracker(module);
  const byteLength = data.byteLength;

  const ptr = module._malloc(byteLength);
  if (ptr === 0) {
    throw new Error(
      `Failed to allocate ${byteLength} bytes (${data.length} Uint32 elements)`,
    );
  }

  // Track allocation
  tracker.allocations.set(ptr, { size: byteLength, type: "uint32" });
  tracker.totalAllocated += byteLength;

  // Verbose logging
  if (tracker.config.verbose) {
    console.log(
      `[mmg-wasm] Allocated ${byteLength} bytes (Uint32[${data.length}]), ` +
        `total: ${tracker.totalAllocated} bytes`,
    );
  }

  // Warning check
  const usagePercent = tracker.totalAllocated / DEFAULT_HEAP_MAX;
  if (usagePercent >= tracker.config.warnThreshold) {
    console.warn(
      `[mmg-wasm] Memory usage at ${(usagePercent * 100).toFixed(1)}% ` +
        `(${tracker.totalAllocated} / ${DEFAULT_HEAP_MAX} bytes)`,
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
    const tracker = trackers.get(module);
    if (tracker) {
      const record = tracker.allocations.get(ptr);
      if (record) {
        tracker.totalAllocated -= record.size;
        tracker.allocations.delete(ptr);

        if (tracker.config.verbose) {
          console.log(
            `[mmg-wasm] Freed ${record.size} bytes, total: ${tracker.totalAllocated} bytes`,
          );
        }
      }
    }
    module._free(ptr);
  }
}

/**
 * Get memory statistics for the WASM module.
 *
 * Returns comprehensive memory statistics including heap size, tracked usage,
 * and percentage thresholds. Note that heapUsed only tracks JS-side allocations
 * made through toWasm* functions, not MMG's internal C mallocs.
 *
 * @param module - The WASM module instance
 * @returns Memory statistics
 *
 * @example
 * ```ts
 * const stats = getMemoryStats(module);
 * console.log(`Used: ${stats.heapUsed} / ${stats.heapMax} bytes (${stats.usagePercent.toFixed(1)}%)`);
 * ```
 */
export function getMemoryStats(module: WasmModule): MemoryStats {
  const tracker = getOrCreateTracker(module);
  const heapSize = module.HEAPU8.byteLength;
  const heapUsed = tracker.totalAllocated;
  const heapMax = DEFAULT_HEAP_MAX;
  const heapFree = Math.max(0, heapSize - heapUsed);
  const usagePercent = (heapUsed / heapMax) * 100;

  return { heapSize, heapUsed, heapFree, heapMax, usagePercent };
}

/**
 * Configure memory tracking settings for a WASM module.
 *
 * @param module - The WASM module instance
 * @param config - Partial configuration to merge with current settings
 *
 * @example
 * ```ts
 * // Enable verbose logging and lower the warning threshold
 * configureMemory(module, { verbose: true, warnThreshold: 0.5 });
 * ```
 */
export function configureMemory(
  module: WasmModule,
  config: Partial<MemoryConfig>,
): void {
  const tracker = getOrCreateTracker(module);
  tracker.config = { ...tracker.config, ...config };
}

/**
 * Check if allocating the specified number of bytes would exceed memory thresholds.
 *
 * Throws a MemoryError if the allocation would exceed the configured errorThreshold.
 * Use this proactively before large allocations to provide better error messages.
 *
 * @param module - The WASM module instance
 * @param bytes - Number of bytes to check
 * @throws MemoryError if allocation would exceed errorThreshold
 *
 * @example
 * ```ts
 * const estimatedSize = estimateMeshMemory(100000, 500000, 10000);
 * checkMemoryAvailable(module, estimatedSize); // Throws if would exceed threshold
 * ```
 */
export function checkMemoryAvailable(module: WasmModule, bytes: number): void {
  const tracker = getOrCreateTracker(module);
  const stats = getMemoryStats(module);
  const projectedUsage = (stats.heapUsed + bytes) / stats.heapMax;

  if (projectedUsage >= tracker.config.errorThreshold) {
    throw new MemoryError(
      `Allocation of ${bytes} bytes would exceed ${(tracker.config.errorThreshold * 100).toFixed(0)}% ` +
        `memory threshold (current: ${stats.usagePercent.toFixed(1)}%)`,
      bytes,
      stats.heapFree,
      stats,
    );
  }
}

/**
 * Estimate memory required for a mesh with the given element counts.
 *
 * This provides a rough estimate based on typical MMG memory layout.
 * Actual memory usage may vary depending on mesh complexity and MMG operations.
 *
 * @param nVertices - Number of vertices
 * @param nTetrahedra - Number of tetrahedra (for 3D meshes)
 * @param nTriangles - Number of triangles
 * @returns Estimated memory in bytes (includes 1.5x overhead factor)
 *
 * @example
 * ```ts
 * const bytes = estimateMeshMemory(10000, 50000, 1000);
 * console.log(`Estimated memory: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
 * ```
 */
export function estimateMeshMemory(
  nVertices: number,
  nTetrahedra: number,
  nTriangles: number,
): number {
  const VERTEX_BYTES = 40;
  const TETRA_BYTES = 80;
  const TRIANGLE_BYTES = 32;
  const OVERHEAD_FACTOR = 1.5;

  const rawBytes =
    nVertices * VERTEX_BYTES +
    nTetrahedra * TETRA_BYTES +
    nTriangles * TRIANGLE_BYTES;

  return Math.ceil(rawBytes * OVERHEAD_FACTOR);
}

/**
 * Reset memory tracking for a WASM module.
 *
 * This clears all tracked allocations without actually freeing memory.
 * Useful if you need to reset tracking state after external operations
 * that bypass the toWasm/freeWasmArray functions.
 *
 * @param module - The WASM module instance
 *
 * @example
 * ```ts
 * // After calling MMG functions that manage their own memory
 * resetMemoryTracking(module);
 * ```
 */
export function resetMemoryTracking(module: WasmModule): void {
  const tracker = trackers.get(module);
  if (tracker) {
    tracker.allocations.clear();
    tracker.totalAllocated = 0;
  }
}
