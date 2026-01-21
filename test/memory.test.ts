import { describe, expect, it, beforeAll } from "bun:test";
import { initMMG3D, getWasmModule } from "../src/mmg3d";
import {
  toWasmFloat64,
  toWasmInt32,
  toWasmUint32,
  fromWasmFloat64,
  fromWasmInt32,
  fromWasmUint32,
  freeWasmArray,
  getMemoryStats,
  type WasmModule,
} from "../src/memory";

describe("Memory Utilities", () => {
  let module: WasmModule;

  beforeAll(async () => {
    await initMMG3D();
    module = getWasmModule() as WasmModule;
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
    it("should return memory statistics", () => {
      const stats = getMemoryStats(module);

      expect(stats.totalMemory).toBeGreaterThan(0);
    });

    it("should report total memory matching HEAPU8 size", () => {
      const stats = getMemoryStats(module);

      expect(stats.totalMemory).toBe(module.HEAPU8.byteLength);
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
});
