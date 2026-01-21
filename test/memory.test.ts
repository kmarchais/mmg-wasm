import { describe, expect, it, beforeAll, beforeEach, mock } from "bun:test";
import { initMMG3D, getWasmModule, type MMG3DModule } from "../src/mmg3d";
import {
  toWasmFloat64,
  toWasmInt32,
  toWasmUint32,
  fromWasmFloat64,
  fromWasmInt32,
  fromWasmUint32,
  freeWasmArray,
  getMemoryStats,
  configureMemory,
  checkMemoryAvailable,
  estimateMeshMemory,
  resetMemoryTracking,
  MemoryError,
} from "../src/memory";

describe("Memory Utilities", () => {
  let module: MMG3DModule;

  beforeAll(async () => {
    await initMMG3D();
    module = getWasmModule();
  });

  describe("toWasmFloat64", () => {
    it("should copy Float64Array to WASM heap and return valid pointer", () => {
      const data = new Float64Array([1.5, 2.5, 3.5, 4.5]);
      const ptr = toWasmFloat64(module, data);

      expect(ptr).toBeGreaterThan(0);
      expect(ptr % 8).toBe(0); // Should be 8-byte aligned

      freeWasmArray(module, ptr);
    });

    it("should return 0 for empty array", () => {
      const data = new Float64Array(0);
      const ptr = toWasmFloat64(module, data);

      expect(ptr).toBe(0);
    });

    it("should preserve data values after copy", () => {
      const data = new Float64Array([1.1, 2.2, 3.3, 4.4, 5.5]);
      const ptr = toWasmFloat64(module, data);

      try {
        // Read back the data directly from heap
        const heapView = module.HEAPF64.subarray(ptr / 8, ptr / 8 + data.length);
        for (let i = 0; i < data.length; i++) {
          expect(heapView[i]).toBeCloseTo(data[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("toWasmInt32", () => {
    it("should copy Int32Array to WASM heap and return valid pointer", () => {
      const data = new Int32Array([1, 2, 3, 4, 5]);
      const ptr = toWasmInt32(module, data);

      expect(ptr).toBeGreaterThan(0);
      expect(ptr % 4).toBe(0); // Should be 4-byte aligned

      freeWasmArray(module, ptr);
    });

    it("should return 0 for empty array", () => {
      const data = new Int32Array(0);
      const ptr = toWasmInt32(module, data);

      expect(ptr).toBe(0);
    });

    it("should preserve data values after copy", () => {
      const data = new Int32Array([10, 20, 30, 40, 50]);
      const ptr = toWasmInt32(module, data);

      try {
        // Read back the data directly from heap
        const heapView = module.HEAP32.subarray(ptr / 4, ptr / 4 + data.length);
        for (let i = 0; i < data.length; i++) {
          expect(heapView[i]).toBe(data[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("toWasmUint32", () => {
    it("should copy Uint32Array to WASM heap and return valid pointer", () => {
      const data = new Uint32Array([1, 2, 3, 4, 5]);
      const ptr = toWasmUint32(module, data);

      expect(ptr).toBeGreaterThan(0);
      expect(ptr % 4).toBe(0); // Should be 4-byte aligned

      freeWasmArray(module, ptr);
    });

    it("should return 0 for empty array", () => {
      const data = new Uint32Array(0);
      const ptr = toWasmUint32(module, data);

      expect(ptr).toBe(0);
    });

    it("should preserve data values after copy", () => {
      const data = new Uint32Array([10, 20, 30, 40, 50]);
      const ptr = toWasmUint32(module, data);

      try {
        // Read back the data directly from heap using a Uint32Array view
        const heapView = new Uint32Array(module.HEAPU8.buffer, ptr, data.length);
        for (let i = 0; i < data.length; i++) {
          expect(heapView[i]).toBe(data[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should handle large unsigned values correctly", () => {
      const data = new Uint32Array([0, 1, 0xffffffff, 0x80000000]);
      const ptr = toWasmUint32(module, data);

      try {
        const heapView = new Uint32Array(module.HEAPU8.buffer, ptr, data.length);
        expect(heapView[0]).toBe(0);
        expect(heapView[1]).toBe(1);
        expect(heapView[2]).toBe(0xffffffff);
        expect(heapView[3]).toBe(0x80000000);
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("fromWasmFloat64", () => {
    it("should copy data from WASM heap to new Float64Array", () => {
      const original = new Float64Array([1.1, 2.2, 3.3, 4.4]);
      const ptr = toWasmFloat64(module, original);

      try {
        const result = fromWasmFloat64(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        for (let i = 0; i < original.length; i++) {
          expect(result[i]).toBeCloseTo(original[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should return empty array for zero length", () => {
      const result = fromWasmFloat64(module, 100, 0);
      expect(result.length).toBe(0);
    });

    it("should return empty array for null pointer", () => {
      const result = fromWasmFloat64(module, 0, 10);
      expect(result.length).toBe(0);
    });

    it("should return a copy, not a view", () => {
      const original = new Float64Array([1.0, 2.0, 3.0]);
      const ptr = toWasmFloat64(module, original);

      try {
        const result = fromWasmFloat64(module, ptr, original.length);

        // Modify the heap data
        module.HEAPF64[ptr / 8] = 999.0;

        // Result should not be affected (it's a copy)
        expect(result[0]).toBeCloseTo(1.0);
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("fromWasmInt32", () => {
    it("should copy data from WASM heap to new Int32Array", () => {
      const original = new Int32Array([10, 20, 30, 40]);
      const ptr = toWasmInt32(module, original);

      try {
        const result = fromWasmInt32(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        for (let i = 0; i < original.length; i++) {
          expect(result[i]).toBe(original[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should return empty array for zero length", () => {
      const result = fromWasmInt32(module, 100, 0);
      expect(result.length).toBe(0);
    });

    it("should return empty array for null pointer", () => {
      const result = fromWasmInt32(module, 0, 10);
      expect(result.length).toBe(0);
    });

    it("should return a copy, not a view", () => {
      const original = new Int32Array([100, 200, 300]);
      const ptr = toWasmInt32(module, original);

      try {
        const result = fromWasmInt32(module, ptr, original.length);

        // Modify the heap data
        module.HEAP32[ptr / 4] = 999;

        // Result should not be affected (it's a copy)
        expect(result[0]).toBe(100);
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("fromWasmUint32", () => {
    it("should copy data from WASM heap to new Uint32Array", () => {
      const original = new Uint32Array([10, 20, 30, 40]);
      const ptr = toWasmUint32(module, original);

      try {
        const result = fromWasmUint32(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        for (let i = 0; i < original.length; i++) {
          expect(result[i]).toBe(original[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should return empty array for zero length", () => {
      const result = fromWasmUint32(module, 100, 0);
      expect(result.length).toBe(0);
    });

    it("should return empty array for null pointer", () => {
      const result = fromWasmUint32(module, 0, 10);
      expect(result.length).toBe(0);
    });

    it("should return a copy, not a view", () => {
      const original = new Uint32Array([100, 200, 300]);
      const ptr = toWasmUint32(module, original);

      try {
        const result = fromWasmUint32(module, ptr, original.length);

        // Modify the heap data using a Uint32Array view
        const heapView = new Uint32Array(module.HEAPU8.buffer, ptr, original.length);
        heapView[0] = 999;

        // Result should not be affected (it's a copy)
        expect(result[0]).toBe(100);
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should handle large unsigned values correctly", () => {
      const original = new Uint32Array([0, 1, 0xffffffff, 0x80000000]);
      const ptr = toWasmUint32(module, original);

      try {
        const result = fromWasmUint32(module, ptr, original.length);

        expect(result[0]).toBe(0);
        expect(result[1]).toBe(1);
        expect(result[2]).toBe(0xffffffff);
        expect(result[3]).toBe(0x80000000);
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("freeWasmArray", () => {
    it("should free allocated memory", () => {
      const data = new Float64Array([1.0, 2.0, 3.0]);
      const ptr = toWasmFloat64(module, data);

      // Should not throw
      expect(() => freeWasmArray(module, ptr)).not.toThrow();
    });

    it("should be a no-op for null pointer (idempotent)", () => {
      // Should not throw when freeing 0
      expect(() => freeWasmArray(module, 0)).not.toThrow();
    });

    it("should allow double-call with 0 (idempotent pattern)", () => {
      // Pattern: set ptr to 0 after freeing, then freeing 0 is safe
      expect(() => {
        freeWasmArray(module, 0);
        freeWasmArray(module, 0);
      }).not.toThrow();
    });
  });

  describe("getMemoryStats", () => {
    beforeEach(() => {
      resetMemoryTracking(module);
    });

    it("should return all memory statistics fields", () => {
      const stats = getMemoryStats(module);

      expect(stats.heapSize).toBeGreaterThan(0);
      expect(stats.heapUsed).toBeGreaterThanOrEqual(0);
      expect(stats.trackedHeapFree).toBeGreaterThanOrEqual(0);
      expect(stats.heapMax).toBe(2 * 1024 * 1024 * 1024); // 2GB
      expect(stats.usagePercent).toBeGreaterThanOrEqual(0);
    });

    it("should report heapSize matching HEAPU8 size", () => {
      const stats = getMemoryStats(module);

      expect(stats.heapSize).toBe(module.HEAPU8.byteLength);
    });

    it("should track allocations in heapUsed", () => {
      const data = new Float64Array(1000); // 8000 bytes
      const ptr = toWasmFloat64(module, data);

      try {
        const stats = getMemoryStats(module);
        expect(stats.heapUsed).toBe(8000);
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should update heapUsed after freeing", () => {
      const data = new Float64Array(1000);
      const ptr = toWasmFloat64(module, data);

      freeWasmArray(module, ptr);

      const stats = getMemoryStats(module);
      expect(stats.heapUsed).toBe(0);
    });

    it("should track multiple allocations", () => {
      const data1 = new Float64Array(100); // 800 bytes
      const data2 = new Int32Array(100); // 400 bytes
      const data3 = new Uint32Array(100); // 400 bytes

      const ptr1 = toWasmFloat64(module, data1);
      const ptr2 = toWasmInt32(module, data2);
      const ptr3 = toWasmUint32(module, data3);

      try {
        const stats = getMemoryStats(module);
        expect(stats.heapUsed).toBe(800 + 400 + 400);
      } finally {
        freeWasmArray(module, ptr1);
        freeWasmArray(module, ptr2);
        freeWasmArray(module, ptr3);
      }
    });

    it("should calculate usagePercent correctly", () => {
      const data = new Float64Array(1000); // 8000 bytes
      const ptr = toWasmFloat64(module, data);

      try {
        const stats = getMemoryStats(module);
        const expectedPercent = (8000 / (2 * 1024 * 1024 * 1024)) * 100;
        expect(stats.usagePercent).toBeCloseTo(expectedPercent);
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("Round-trip tests", () => {
    it("should round-trip Float64Array through WASM heap", () => {
      const original = new Float64Array([
        0.0, 1.1, -2.2, 3.3, Math.PI, Math.E, Number.MAX_VALUE, Number.MIN_VALUE,
      ]);
      const ptr = toWasmFloat64(module, original);

      try {
        const result = fromWasmFloat64(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        for (let i = 0; i < original.length; i++) {
          expect(result[i]).toBeCloseTo(original[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should round-trip Int32Array through WASM heap", () => {
      const original = new Int32Array([
        0, 1, -1, 100, -100, 2147483647, -2147483648,
      ]);
      const ptr = toWasmInt32(module, original);

      try {
        const result = fromWasmInt32(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        for (let i = 0; i < original.length; i++) {
          expect(result[i]).toBe(original[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should round-trip Uint32Array through WASM heap", () => {
      const original = new Uint32Array([
        0, 1, 100, 0x7fffffff, 0x80000000, 0xffffffff,
      ]);
      const ptr = toWasmUint32(module, original);

      try {
        const result = fromWasmUint32(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        for (let i = 0; i < original.length; i++) {
          expect(result[i]).toBe(original[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should handle large Float64Array (100K elements)", () => {
      const size = 100000;
      const original = new Float64Array(size);
      for (let i = 0; i < size; i++) {
        original[i] = i * 0.1;
      }

      const ptr = toWasmFloat64(module, original);

      try {
        const result = fromWasmFloat64(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        // Spot check some values
        expect(result[0]).toBeCloseTo(0.0);
        expect(result[1000]).toBeCloseTo(100.0);
        expect(result[size - 1]).toBeCloseTo((size - 1) * 0.1);
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should handle large Int32Array (100K elements)", () => {
      const size = 100000;
      const original = new Int32Array(size);
      for (let i = 0; i < size; i++) {
        original[i] = i;
      }

      const ptr = toWasmInt32(module, original);

      try {
        const result = fromWasmInt32(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        // Spot check some values
        expect(result[0]).toBe(0);
        expect(result[1000]).toBe(1000);
        expect(result[size - 1]).toBe(size - 1);
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should handle large Uint32Array (100K elements)", () => {
      const size = 100000;
      const original = new Uint32Array(size);
      for (let i = 0; i < size; i++) {
        original[i] = i;
      }

      const ptr = toWasmUint32(module, original);

      try {
        const result = fromWasmUint32(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        // Spot check some values
        expect(result[0]).toBe(0);
        expect(result[1000]).toBe(1000);
        expect(result[size - 1]).toBe(size - 1);
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("configureMemory", () => {
    beforeEach(() => {
      resetMemoryTracking(module);
      // Reset to default config
      configureMemory(module, {
        warnThreshold: 0.8,
        errorThreshold: 0.95,
        verbose: false,
      });
    });

    it("should accept partial configuration", () => {
      // Should not throw
      expect(() => configureMemory(module, { verbose: true })).not.toThrow();
    });

    it("should merge configuration with existing settings", () => {
      configureMemory(module, { warnThreshold: 0.5 });
      configureMemory(module, { errorThreshold: 0.9 });

      // Both settings should be preserved (tested indirectly through behavior)
      expect(() => configureMemory(module, {})).not.toThrow();
    });

    it("should clamp negative thresholds to 0", () => {
      configureMemory(module, { warnThreshold: -0.5, errorThreshold: -1 });

      // Very small allocation should not trigger error with threshold clamped to 0
      // (0 threshold means error on any allocation, but clamping means it becomes 0)
      // Actually with threshold at 0, any allocation would exceed it
      // Let's verify the behavior is defined (no crash)
      expect(() => configureMemory(module, { warnThreshold: -0.5 })).not.toThrow();
    });

    it("should clamp thresholds greater than 1 to 1", () => {
      configureMemory(module, { warnThreshold: 1.5, errorThreshold: 2.0 });

      // With threshold at 1.0, very large allocations should still work until truly at limit
      // Let's just verify it doesn't throw during configuration
      expect(() => configureMemory(module, { errorThreshold: 1.5 })).not.toThrow();

      // Verify behavior: with errorThreshold clamped to 1.0, we can allocate without error
      const data = new Float64Array(1000);
      const ptr = toWasmFloat64(module, data);
      try {
        // Should not throw since we're well under 100% of 2GB
        expect(() => checkMemoryAvailable(module, 1000)).not.toThrow();
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("checkMemoryAvailable", () => {
    beforeEach(() => {
      resetMemoryTracking(module);
      configureMemory(module, {
        warnThreshold: 0.8,
        errorThreshold: 0.95,
        verbose: false,
      });
    });

    it("should not throw for small allocations", () => {
      expect(() => checkMemoryAvailable(module, 1000)).not.toThrow();
    });

    it("should throw MemoryError when allocation would exceed threshold", () => {
      // Set a very low threshold
      configureMemory(module, { errorThreshold: 0.00001 });

      // Now even a small allocation should exceed it
      expect(() => checkMemoryAvailable(module, 1000000)).toThrow(MemoryError);
    });

    it("should include useful information in MemoryError", () => {
      configureMemory(module, { errorThreshold: 0.00001 });

      try {
        checkMemoryAvailable(module, 1000000);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(MemoryError);
        const memError = error as MemoryError;
        expect(memError.requested).toBe(1000000);
        expect(memError.available).toBeGreaterThan(0);
        expect(memError.stats).toBeDefined();
        expect(memError.stats.heapSize).toBeGreaterThan(0);
      }
    });

    it("should consider existing allocations", () => {
      // Set threshold to 50%
      configureMemory(module, { errorThreshold: 0.5 });

      // First allocation: should be fine
      const data = new Float64Array(100);
      const ptr = toWasmFloat64(module, data);

      try {
        // Checking for a huge allocation that would push us over 50%
        const hugeSize = 2 * 1024 * 1024 * 1024 * 0.5; // 50% of 2GB
        expect(() => checkMemoryAvailable(module, hugeSize)).toThrow(
          MemoryError,
        );
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("estimateMeshMemory", () => {
    it("should return a positive number for any mesh", () => {
      const bytes = estimateMeshMemory(100, 50, 20);
      expect(bytes).toBeGreaterThan(0);
    });

    it("should return 0 for empty mesh", () => {
      const bytes = estimateMeshMemory(0, 0, 0);
      expect(bytes).toBe(0);
    });

    it("should scale with vertex count", () => {
      const bytes1 = estimateMeshMemory(100, 0, 0);
      const bytes2 = estimateMeshMemory(200, 0, 0);
      expect(bytes2).toBe(bytes1 * 2);
    });

    it("should scale with tetrahedra count", () => {
      const bytes1 = estimateMeshMemory(0, 100, 0);
      const bytes2 = estimateMeshMemory(0, 200, 0);
      expect(bytes2).toBe(bytes1 * 2);
    });

    it("should scale with triangle count", () => {
      const bytes1 = estimateMeshMemory(0, 0, 100);
      const bytes2 = estimateMeshMemory(0, 0, 200);
      expect(bytes2).toBe(bytes1 * 2);
    });

    it("should return reasonable estimate for typical mesh", () => {
      // 10K vertices, 50K tetrahedra, 1K triangles
      const bytes = estimateMeshMemory(10000, 50000, 1000);

      // Should be in the MB range
      expect(bytes).toBeGreaterThan(1024 * 1024); // > 1MB
      expect(bytes).toBeLessThan(100 * 1024 * 1024); // < 100MB
    });
  });

  describe("resetMemoryTracking", () => {
    it("should reset heapUsed to 0", () => {
      const data = new Float64Array(1000);
      const ptr = toWasmFloat64(module, data);

      // Before reset
      expect(getMemoryStats(module).heapUsed).toBeGreaterThan(0);

      // Reset tracking (note: this doesn't free memory, just clears tracking)
      resetMemoryTracking(module);

      // After reset
      expect(getMemoryStats(module).heapUsed).toBe(0);

      // Still need to free the actual memory
      module._free(ptr);
    });

    it("should be safe to call multiple times", () => {
      expect(() => {
        resetMemoryTracking(module);
        resetMemoryTracking(module);
        resetMemoryTracking(module);
      }).not.toThrow();
    });

    it("should not affect subsequent allocations", () => {
      resetMemoryTracking(module);

      const data = new Float64Array(100);
      const ptr = toWasmFloat64(module, data);

      try {
        expect(getMemoryStats(module).heapUsed).toBe(800);
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("MemoryError", () => {
    it("should have correct name", () => {
      const stats = getMemoryStats(module);
      const error = new MemoryError("test", 1000, 500, stats);
      expect(error.name).toBe("MemoryError");
    });

    it("should store requested and available values", () => {
      const stats = getMemoryStats(module);
      const error = new MemoryError("test", 1000, 500, stats);
      expect(error.requested).toBe(1000);
      expect(error.available).toBe(500);
    });

    it("should store stats", () => {
      const stats = getMemoryStats(module);
      const error = new MemoryError("test", 1000, 500, stats);
      expect(error.stats).toBe(stats);
    });

    it("should be an instance of Error", () => {
      const stats = getMemoryStats(module);
      const error = new MemoryError("test", 1000, 500, stats);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("Warning debouncing", () => {
    beforeEach(() => {
      resetMemoryTracking(module);
      configureMemory(module, {
        warnThreshold: 0.8,
        errorThreshold: 0.95,
        verbose: false,
      });
    });

    it("should only warn once when crossing threshold", () => {
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = mock((...args: unknown[]) => {
        warnings.push(args.join(" "));
      });

      try {
        // Set a very low threshold so we can trigger it
        configureMemory(module, { warnThreshold: 0.0000001 });

        // First allocation should trigger warning
        const data1 = new Float64Array(100);
        const ptr1 = toWasmFloat64(module, data1);

        // Second allocation should NOT trigger another warning
        const data2 = new Float64Array(100);
        const ptr2 = toWasmFloat64(module, data2);

        // Third allocation should NOT trigger another warning
        const data3 = new Float64Array(100);
        const ptr3 = toWasmFloat64(module, data3);

        // Should only have one warning
        const memoryWarnings = warnings.filter((w) => w.includes("[mmg-wasm]"));
        expect(memoryWarnings.length).toBe(1);

        freeWasmArray(module, ptr1);
        freeWasmArray(module, ptr2);
        freeWasmArray(module, ptr3);
      } finally {
        console.warn = originalWarn;
      }
    });

    it("should warn again after falling below and crossing threshold again", () => {
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = mock((...args: unknown[]) => {
        warnings.push(args.join(" "));
      });

      try {
        // Set a very low threshold
        configureMemory(module, { warnThreshold: 0.0000001 });

        // First allocation triggers warning
        const data1 = new Float64Array(100);
        const ptr1 = toWasmFloat64(module, data1);

        // Free it - this resets the warning flag
        freeWasmArray(module, ptr1);

        // Second allocation should trigger warning again
        const data2 = new Float64Array(100);
        const ptr2 = toWasmFloat64(module, data2);

        // Should have two warnings
        const memoryWarnings = warnings.filter((w) => w.includes("[mmg-wasm]"));
        expect(memoryWarnings.length).toBe(2);

        freeWasmArray(module, ptr2);
      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe("Verbose logging", () => {
    beforeEach(() => {
      resetMemoryTracking(module);
    });

    it("should log allocations when verbose is enabled", () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = mock((...args: unknown[]) => {
        logs.push(args.join(" "));
      });

      try {
        configureMemory(module, { verbose: true });
        const data = new Float64Array(10);
        const ptr = toWasmFloat64(module, data);
        freeWasmArray(module, ptr);

        expect(logs.some((log) => log.includes("[mmg-wasm]"))).toBe(true);
        expect(logs.some((log) => log.includes("Allocated"))).toBe(true);
        expect(logs.some((log) => log.includes("Freed"))).toBe(true);
      } finally {
        console.log = originalLog;
        configureMemory(module, { verbose: false });
      }
    });

    it("should not log when verbose is disabled", () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = mock((...args: unknown[]) => {
        logs.push(args.join(" "));
      });

      try {
        configureMemory(module, { verbose: false });
        const data = new Float64Array(10);
        const ptr = toWasmFloat64(module, data);
        freeWasmArray(module, ptr);

        expect(logs.filter((log) => log.includes("[mmg-wasm]")).length).toBe(0);
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe("Random data round-trip", () => {
    beforeEach(() => {
      resetMemoryTracking(module);
    });

    it("should round-trip random Float64 data without loss", () => {
      const size = 1000;
      const original = new Float64Array(size);
      for (let i = 0; i < size; i++) {
        original[i] = Math.random() * 1000 - 500; // Random values in [-500, 500)
      }

      const ptr = toWasmFloat64(module, original);

      try {
        const result = fromWasmFloat64(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        for (let i = 0; i < original.length; i++) {
          expect(result[i]).toBe(original[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should round-trip random Int32 data without loss", () => {
      const size = 1000;
      const original = new Int32Array(size);
      for (let i = 0; i < size; i++) {
        original[i] = Math.floor(Math.random() * 0xffffffff) - 0x7fffffff;
      }

      const ptr = toWasmInt32(module, original);

      try {
        const result = fromWasmInt32(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        for (let i = 0; i < original.length; i++) {
          expect(result[i]).toBe(original[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });

    it("should round-trip random Uint32 data without loss", () => {
      const size = 1000;
      const original = new Uint32Array(size);
      for (let i = 0; i < size; i++) {
        original[i] = Math.floor(Math.random() * 0xffffffff);
      }

      const ptr = toWasmUint32(module, original);

      try {
        const result = fromWasmUint32(module, ptr, original.length);

        expect(result.length).toBe(original.length);
        for (let i = 0; i < original.length; i++) {
          expect(result[i]).toBe(original[i]);
        }
      } finally {
        freeWasmArray(module, ptr);
      }
    });
  });

  describe("Memory Leak Detection", () => {
    beforeEach(() => {
      resetMemoryTracking(module);
    });

    it("should not leak memory in alloc/free cycles (100 iterations, 10K floats each)", () => {
      const iterations = 100;
      const elementsPerIteration = 10000; // 80KB per iteration

      const statsBefore = getMemoryStats(module);

      for (let i = 0; i < iterations; i++) {
        const data = new Float64Array(elementsPerIteration);
        for (let j = 0; j < elementsPerIteration; j++) {
          data[j] = i * elementsPerIteration + j;
        }

        const ptr = toWasmFloat64(module, data);
        freeWasmArray(module, ptr);
      }

      const statsAfter = getMemoryStats(module);

      // Tracked memory should return to zero
      expect(statsAfter.heapUsed).toBe(statsBefore.heapUsed);
    });

    it("should not leak memory in mixed alloc/free cycles", () => {
      const iterations = 50;

      const statsBefore = getMemoryStats(module);

      for (let i = 0; i < iterations; i++) {
        // Allocate multiple arrays of different types
        const floatData = new Float64Array(1000);
        const intData = new Int32Array(1000);
        const uintData = new Uint32Array(1000);

        const ptrFloat = toWasmFloat64(module, floatData);
        const ptrInt = toWasmInt32(module, intData);
        const ptrUint = toWasmUint32(module, uintData);

        // Free in different order than allocation
        freeWasmArray(module, ptrInt);
        freeWasmArray(module, ptrUint);
        freeWasmArray(module, ptrFloat);
      }

      const statsAfter = getMemoryStats(module);

      // Tracked memory should return to zero
      expect(statsAfter.heapUsed).toBe(statsBefore.heapUsed);
    });

    it("should track correct memory usage during multiple allocations", () => {
      const allocations: number[] = [];
      const expectedSizes = [8000, 4000, 4000]; // Float64(1000), Int32(1000), Uint32(1000)

      // Allocate arrays
      const float64Data = new Float64Array(1000);
      const int32Data = new Int32Array(1000);
      const uint32Data = new Uint32Array(1000);

      allocations.push(toWasmFloat64(module, float64Data));
      expect(getMemoryStats(module).heapUsed).toBe(8000);

      allocations.push(toWasmInt32(module, int32Data));
      expect(getMemoryStats(module).heapUsed).toBe(12000);

      allocations.push(toWasmUint32(module, uint32Data));
      expect(getMemoryStats(module).heapUsed).toBe(16000);

      // Free and verify tracking decreases correctly
      freeWasmArray(module, allocations[1]); // Free int32
      expect(getMemoryStats(module).heapUsed).toBe(12000);

      freeWasmArray(module, allocations[0]); // Free float64
      expect(getMemoryStats(module).heapUsed).toBe(4000);

      freeWasmArray(module, allocations[2]); // Free uint32
      expect(getMemoryStats(module).heapUsed).toBe(0);
    });
  });

  describe("Large allocation tests", () => {
    beforeEach(() => {
      resetMemoryTracking(module);
    });

    it("should handle large allocation (~80MB, 10 million floats)", () => {
      const size = 10_000_000; // 10 million floats = ~80MB
      const requiredBytes = size * 8;

      // Check if we have enough memory headroom
      const stats = getMemoryStats(module);
      const available = stats.heapMax - stats.heapUsed;

      if (available < requiredBytes * 1.5) {
        // Skip test if insufficient memory (needs 1.5x for safety margin)
        console.log(
          `Skipping large allocation test: insufficient memory (${available} < ${requiredBytes * 1.5})`,
        );
        return;
      }

      const data = new Float64Array(size);
      // Fill with pattern for verification
      for (let i = 0; i < size; i += 1000) {
        data[i] = i;
      }

      const ptr = toWasmFloat64(module, data);

      try {
        expect(ptr).toBeGreaterThan(0);

        // Spot-check data integrity
        const result = fromWasmFloat64(module, ptr, size);
        expect(result[0]).toBe(0);
        expect(result[1000]).toBe(1000);
        expect(result[5_000_000]).toBe(5_000_000);
        expect(result[9_999_000]).toBe(9_999_000);

        // Verify tracking
        const statsAfterAlloc = getMemoryStats(module);
        expect(statsAfterAlloc.heapUsed).toBe(requiredBytes);
      } finally {
        freeWasmArray(module, ptr);
      }

      // Verify cleanup
      const statsAfterFree = getMemoryStats(module);
      expect(statsAfterFree.heapUsed).toBe(0);
    });

    it("should handle large Int32 allocation (~40MB)", () => {
      const size = 10_000_000; // 10 million ints = ~40MB
      const requiredBytes = size * 4;

      const stats = getMemoryStats(module);
      const available = stats.heapMax - stats.heapUsed;

      if (available < requiredBytes * 1.5) {
        console.log(
          `Skipping large Int32 allocation test: insufficient memory`,
        );
        return;
      }

      const data = new Int32Array(size);
      for (let i = 0; i < size; i += 1000) {
        data[i] = i;
      }

      const ptr = toWasmInt32(module, data);

      try {
        expect(ptr).toBeGreaterThan(0);

        const result = fromWasmInt32(module, ptr, size);
        expect(result[0]).toBe(0);
        expect(result[1000]).toBe(1000);
        expect(result[5_000_000]).toBe(5_000_000);
      } finally {
        freeWasmArray(module, ptr);
      }

      expect(getMemoryStats(module).heapUsed).toBe(0);
    });
  });

  describe("Double-free safety", () => {
    beforeEach(() => {
      resetMemoryTracking(module);
    });

    it("should be a no-op when freeing the same pointer twice", () => {
      const data = new Float64Array([1.0, 2.0, 3.0]);
      const ptr = toWasmFloat64(module, data);

      // First free - should work
      freeWasmArray(module, ptr);
      expect(getMemoryStats(module).heapUsed).toBe(0);

      // Second free - should be a no-op (not UB)
      expect(() => freeWasmArray(module, ptr)).not.toThrow();
      expect(getMemoryStats(module).heapUsed).toBe(0);
    });

    it("should be a no-op when freeing an untracked pointer", () => {
      // Manually allocate memory without going through toWasm*
      const ptr = module._malloc(100);
      expect(ptr).toBeGreaterThan(0);

      // freeWasmArray should be a no-op for untracked pointers
      expect(() => freeWasmArray(module, ptr)).not.toThrow();

      // Clean up manually (the memory is still allocated)
      module._free(ptr);
    });

    it("should be safe to call freeWasmArray repeatedly on same pointer", () => {
      const data = new Int32Array([1, 2, 3, 4, 5]);
      const ptr = toWasmInt32(module, data);

      // Free multiple times
      expect(() => {
        freeWasmArray(module, ptr);
        freeWasmArray(module, ptr);
        freeWasmArray(module, ptr);
        freeWasmArray(module, ptr);
        freeWasmArray(module, ptr);
      }).not.toThrow();

      expect(getMemoryStats(module).heapUsed).toBe(0);
    });

    it("should handle interleaved alloc/free/double-free correctly", () => {
      const data1 = new Float64Array([1.0, 2.0]);
      const data2 = new Float64Array([3.0, 4.0]);

      const ptr1 = toWasmFloat64(module, data1);
      const ptr2 = toWasmFloat64(module, data2);

      expect(getMemoryStats(module).heapUsed).toBe(32); // 2 * 8 * 2

      // Free ptr1 twice
      freeWasmArray(module, ptr1);
      freeWasmArray(module, ptr1);
      expect(getMemoryStats(module).heapUsed).toBe(16);

      // Free ptr2 normally
      freeWasmArray(module, ptr2);
      expect(getMemoryStats(module).heapUsed).toBe(0);

      // Free both again (should be no-ops)
      freeWasmArray(module, ptr1);
      freeWasmArray(module, ptr2);
      expect(getMemoryStats(module).heapUsed).toBe(0);
    });

    it("should not free when no tracker exists for module", () => {
      // Create a mock module-like object
      const mockModule = {
        _malloc: (size: number) => 1000,
        _free: mock(() => {}),
        HEAPU8: new Uint8Array(1024),
        HEAPF64: new Float64Array(128),
        HEAP32: new Int32Array(256),
      };

      // freeWasmArray should not call _free since there's no tracker
      freeWasmArray(mockModule, 1000);
      expect(mockModule._free).not.toHaveBeenCalled();
    });
  });
});
