/**
 * Performance benchmarks for mmg-wasm remeshing operations.
 *
 * Run with: bun test test/benchmark.test.ts
 *
 * These benchmarks measure the performance of remeshing operations
 * on various mesh sizes to track performance regressions.
 */

import { describe, expect, it } from "bun:test";
import { Mesh, MeshType, type RemeshResult } from "../src";

interface BenchmarkResult {
  name: string;
  iterations: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  inputVertices: number;
  outputVertices: number;
  throughput: number;
}

/**
 * Generate a simple cube mesh for 3D benchmarks
 */
function generateCubeMesh(gridSize: number): {
  vertices: Float64Array;
  cells: Int32Array;
} {
  const n = gridSize;
  const vertices: number[] = [];
  const tetrahedra: number[] = [];

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      for (let k = 0; k <= n; k++) {
        vertices.push(i / n, j / n, k / n);
      }
    }
  }

  const idx = (i: number, j: number, k: number) =>
    i * (n + 1) * (n + 1) + j * (n + 1) + k + 1;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        const v0 = idx(i, j, k);
        const v1 = idx(i + 1, j, k);
        const v2 = idx(i + 1, j + 1, k);
        const v3 = idx(i, j + 1, k);
        const v4 = idx(i, j, k + 1);
        const v6 = idx(i + 1, j + 1, k + 1);
        const v7 = idx(i, j + 1, k + 1);

        tetrahedra.push(v0, v1, v3, v4);
        tetrahedra.push(v1, v2, v3, v6);
        tetrahedra.push(v3, v4, v6, v7);
        tetrahedra.push(v1, v3, v4, v6);
      }
    }
  }

  return {
    vertices: new Float64Array(vertices),
    cells: new Int32Array(tetrahedra),
  };
}

/**
 * Generate a 2D square mesh
 */
function generateSquareMesh(gridSize: number): {
  vertices: Float64Array;
  cells: Int32Array;
} {
  const n = gridSize;
  const vertices: number[] = [];
  const triangles: number[] = [];

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      vertices.push(i / n, j / n);
    }
  }

  const idx = (i: number, j: number) => i * (n + 1) + j + 1;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v0 = idx(i, j);
      const v1 = idx(i + 1, j);
      const v2 = idx(i + 1, j + 1);
      const v3 = idx(i, j + 1);

      triangles.push(v0, v1, v2);
      triangles.push(v0, v2, v3);
    }
  }

  return {
    vertices: new Float64Array(vertices),
    cells: new Int32Array(triangles),
  };
}

/**
 * Generate a surface mesh (sphere approximation)
 */
function generateSphereMesh(segments: number): {
  vertices: Float64Array;
  cells: Int32Array;
} {
  const vertices: number[] = [];
  const triangles: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const theta = (i * Math.PI) / segments;
    for (let j = 0; j <= segments; j++) {
      const phi = (j * 2 * Math.PI) / segments;
      vertices.push(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta)
      );
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const v0 = i * (segments + 1) + j + 1;
      const v1 = v0 + segments + 1;
      const v2 = v0 + 1;
      const v3 = v1 + 1;

      triangles.push(v0, v1, v2);
      triangles.push(v2, v1, v3);
    }
  }

  return {
    vertices: new Float64Array(vertices),
    cells: new Int32Array(triangles),
  };
}

async function runBenchmark(
  createMesh: () => { vertices: Float64Array; cells: Int32Array },
  meshType: MeshType,
  options: { hmax?: number },
  iterations = 3
): Promise<BenchmarkResult> {
  const times: number[] = [];
  let lastResult: RemeshResult | null = null;
  const inputData = createMesh();
  const inputVertices =
    meshType === MeshType.Mesh2D
      ? inputData.vertices.length / 2
      : inputData.vertices.length / 3;

  // Warmup
  const warmupMesh = await Mesh.create({
    vertices: inputData.vertices,
    cells: inputData.cells,
    type: meshType,
  });
  const warmupResult = await warmupMesh.remesh(options);
  warmupResult.mesh.free();

  // Timed runs
  for (let i = 0; i < iterations; i++) {
    const data = createMesh();
    const mesh = await Mesh.create({
      vertices: data.vertices,
      cells: data.cells,
      type: meshType,
    });

    const start = performance.now();
    const result = await mesh.remesh(options);
    const end = performance.now();

    times.push(end - start);
    if (lastResult) lastResult.mesh.free();
    lastResult = result;
  }

  const outputVertices = lastResult?.mesh.vertexCount ?? 0;
  lastResult?.mesh.free();

  const avgTime = times.reduce((a, b) => a + b, 0) / iterations;

  return {
    name: "",
    iterations,
    avgTime,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    inputVertices,
    outputVertices,
    throughput: inputVertices / (avgTime / 1000),
  };
}

describe("Performance Benchmarks", () => {
  const results: BenchmarkResult[] = [];

  describe("MMG3D", () => {
    it("should remesh cube mesh", async () => {
      const result = await runBenchmark(
        () => generateCubeMesh(8),
        MeshType.Mesh3D,
        { hmax: 0.15 },
        2 // fewer iterations to avoid memory exhaustion
      );
      result.name = "3D cube";
      results.push(result);
      expect(result.avgTime).toBeLessThan(5000);
      console.log(`  3D cube: ${result.avgTime.toFixed(1)}ms avg (${result.inputVertices} vertices)`);
    });
  });

  describe("MMG2D", () => {
    it("should remesh small square mesh", async () => {
      const result = await runBenchmark(
        () => generateSquareMesh(15),
        MeshType.Mesh2D,
        { hmax: 0.05 }
      );
      result.name = "2D small";
      results.push(result);
      expect(result.avgTime).toBeLessThan(2000);
      console.log(`  2D small: ${result.avgTime.toFixed(1)}ms avg`);
    });

    it("should remesh medium square mesh", async () => {
      const result = await runBenchmark(
        () => generateSquareMesh(25),
        MeshType.Mesh2D,
        { hmax: 0.04 }
      );
      result.name = "2D medium";
      results.push(result);
      expect(result.avgTime).toBeLessThan(5000);
      console.log(`  2D medium: ${result.avgTime.toFixed(1)}ms avg`);
    });
  });

  describe("MMGS", () => {
    it("should remesh small sphere mesh", async () => {
      const result = await runBenchmark(
        () => generateSphereMesh(12),
        MeshType.MeshS,
        { hmax: 0.15 }
      );
      result.name = "Surface small";
      results.push(result);
      expect(result.avgTime).toBeLessThan(2000);
      console.log(`  Surface small: ${result.avgTime.toFixed(1)}ms avg`);
    });

    it("should remesh medium sphere mesh", async () => {
      const result = await runBenchmark(
        () => generateSphereMesh(20),
        MeshType.MeshS,
        { hmax: 0.12 }
      );
      result.name = "Surface medium";
      results.push(result);
      expect(result.avgTime).toBeLessThan(5000);
      console.log(`  Surface medium: ${result.avgTime.toFixed(1)}ms avg`);
    });
  });

  describe("Summary", () => {
    it("should print benchmark summary", () => {
      console.log("\n═══════════════════════════════════════════════════════════════");
      console.log("                   Benchmark Summary                            ");
      console.log("═══════════════════════════════════════════════════════════════");
      console.log("");
      console.log("┌──────────────────┬──────────┬──────────┬──────────┬──────────────┐");
      console.log("│ Benchmark        │ Avg (ms) │ Min (ms) │ Max (ms) │ Verts/sec    │");
      console.log("├──────────────────┼──────────┼──────────┼──────────┼──────────────┤");

      for (const r of results) {
        const name = r.name.padEnd(16);
        const avg = r.avgTime.toFixed(1).padStart(8);
        const min = r.minTime.toFixed(1).padStart(8);
        const max = r.maxTime.toFixed(1).padStart(8);
        const throughput = Math.round(r.throughput).toLocaleString().padStart(12);
        console.log(`│ ${name} │ ${avg} │ ${min} │ ${max} │ ${throughput} │`);
      }

      console.log("└──────────────────┴──────────┴──────────┴──────────┴──────────────┘");
      console.log("");

      if (results.length > 0) {
        const avgThroughput =
          results.reduce((a, b) => a + b.throughput, 0) / results.length;
        console.log(`Average throughput: ${Math.round(avgThroughput).toLocaleString()} vertices/sec`);
      }

      expect(results.length).toBeGreaterThan(0);
    });
  });
});
