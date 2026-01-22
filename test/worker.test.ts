import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { Mesh, MeshType, MeshWorker, remeshInWorker } from "../src";
import { initMMG2D } from "../src/mmg2d";
import { initMMG3D } from "../src/mmg3d";
import { initMMGS } from "../src/mmgs";
import type {
  SerializedMeshData,
  SerializedRemeshResult,
} from "../src/worker/types";
import { cubeTetrahedra, cubeTriangles, cubeVertices } from "./fixtures/cube";
import {
  squareEdges,
  squareTriangles,
  squareVertices,
} from "./fixtures/square";

/**
 * Helper to serialize mesh data (mirrors worker logic)
 */
function serializeMesh(mesh: Mesh): SerializedMeshData {
  const data: SerializedMeshData = {
    vertices: mesh.vertices.slice(),
    cells: mesh.cells.slice(),
    type: mesh.type,
  };

  if (mesh.nBoundaryFaces > 0) {
    data.boundaryFaces = mesh.boundaryFaces.slice();
  }

  return data;
}

/**
 * Helper to deserialize result data (mirrors worker logic)
 */
function deserializeResult(serialized: SerializedRemeshResult): {
  mesh: Mesh;
  result: Omit<SerializedRemeshResult, "mesh">;
} {
  const mesh = new Mesh({
    vertices: serialized.mesh.vertices,
    cells: serialized.mesh.cells,
    type: serialized.mesh.type,
    boundaryFaces: serialized.mesh.boundaryFaces,
  });

  return {
    mesh,
    result: {
      nVertices: serialized.nVertices,
      nCells: serialized.nCells,
      nBoundaryFaces: serialized.nBoundaryFaces,
      elapsed: serialized.elapsed,
      qualityBefore: serialized.qualityBefore,
      qualityAfter: serialized.qualityAfter,
      qualityImprovement: serialized.qualityImprovement,
      nInserted: serialized.nInserted,
      nDeleted: serialized.nDeleted,
      nSwapped: serialized.nSwapped,
      nMoved: serialized.nMoved,
      success: serialized.success,
      warnings: serialized.warnings,
    },
  };
}

describe("Worker Types - Serialization", () => {
  const meshes: Mesh[] = [];

  beforeAll(async () => {
    await initMMG2D();
    await initMMG3D();
    await initMMGS();
  });

  afterEach(() => {
    for (const mesh of meshes) {
      try {
        mesh.free();
      } catch {
        // Ignore
      }
    }
    meshes.length = 0;
  });

  describe("Mesh Serialization", () => {
    it("should serialize 3D mesh to transferable data", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
        boundaryFaces: cubeTriangles,
      });
      meshes.push(mesh);

      const serialized = serializeMesh(mesh);

      expect(serialized.type).toBe(MeshType.Mesh3D);
      expect(serialized.vertices).toBeInstanceOf(Float64Array);
      expect(serialized.cells).toBeInstanceOf(Int32Array);
      expect(serialized.vertices.length).toBe(cubeVertices.length);
      expect(serialized.cells.length).toBe(cubeTetrahedra.length);
      expect(serialized.boundaryFaces).toBeDefined();
      expect(serialized.boundaryFaces?.length).toBe(cubeTriangles.length);
    });

    it("should serialize 2D mesh to transferable data", () => {
      const mesh = new Mesh({
        vertices: squareVertices,
        cells: squareTriangles,
        boundaryFaces: squareEdges,
      });
      meshes.push(mesh);

      const serialized = serializeMesh(mesh);

      expect(serialized.type).toBe(MeshType.Mesh2D);
      expect(serialized.vertices.length).toBe(squareVertices.length);
      expect(serialized.cells.length).toBe(squareTriangles.length);
    });

    it("should serialize surface mesh to transferable data", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTriangles,
        type: MeshType.MeshS,
      });
      meshes.push(mesh);

      const serialized = serializeMesh(mesh);

      expect(serialized.type).toBe(MeshType.MeshS);
      expect(serialized.vertices.length).toBe(cubeVertices.length);
      expect(serialized.cells.length).toBe(cubeTriangles.length);
    });

    it("should create copies of typed arrays (not views)", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
      });
      meshes.push(mesh);

      const serialized = serializeMesh(mesh);

      // Modify original should not affect serialized
      const originalVertices = mesh.vertices;
      const originalFirst = serialized.vertices[0];

      // Serialized should be a copy
      expect(serialized.vertices.buffer).not.toBe(originalVertices.buffer);
      expect(serialized.vertices[0]).toBe(originalFirst);
    });
  });

  describe("Result Deserialization", () => {
    it("should deserialize result back to Mesh", async () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
        boundaryFaces: cubeTriangles,
      });
      meshes.push(mesh);

      // Simulate worker result
      const result = await mesh.remesh({ hmax: 0.3 });
      meshes.push(result.mesh);

      // Serialize then deserialize (simulating worker transfer)
      const serialized: SerializedRemeshResult = {
        mesh: serializeMesh(result.mesh),
        nVertices: result.nVertices,
        nCells: result.nCells,
        nBoundaryFaces: result.nBoundaryFaces,
        elapsed: result.elapsed,
        qualityBefore: result.qualityBefore,
        qualityAfter: result.qualityAfter,
        qualityImprovement: result.qualityImprovement,
        nInserted: result.nInserted,
        nDeleted: result.nDeleted,
        nSwapped: result.nSwapped,
        nMoved: result.nMoved,
        success: result.success,
        warnings: result.warnings,
      };

      const deserialized = deserializeResult(serialized);
      meshes.push(deserialized.mesh);

      // Verify mesh was reconstructed
      expect(deserialized.mesh).toBeInstanceOf(Mesh);
      expect(deserialized.mesh.type).toBe(MeshType.Mesh3D);
      expect(deserialized.mesh.nVertices).toBe(result.nVertices);
      expect(deserialized.mesh.nCells).toBe(result.nCells);

      // Verify stats preserved
      expect(deserialized.result.success).toBe(true);
      expect(deserialized.result.elapsed).toBeGreaterThan(0);
    });

    it("should preserve all result statistics", async () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
        boundaryFaces: cubeTriangles,
      });
      meshes.push(mesh);

      const result = await mesh.remesh({ hmax: 0.2 });
      meshes.push(result.mesh);

      const serialized: SerializedRemeshResult = {
        mesh: serializeMesh(result.mesh),
        nVertices: result.nVertices,
        nCells: result.nCells,
        nBoundaryFaces: result.nBoundaryFaces,
        elapsed: result.elapsed,
        qualityBefore: result.qualityBefore,
        qualityAfter: result.qualityAfter,
        qualityImprovement: result.qualityImprovement,
        nInserted: result.nInserted,
        nDeleted: result.nDeleted,
        nSwapped: result.nSwapped,
        nMoved: result.nMoved,
        success: result.success,
        warnings: result.warnings,
      };

      const deserialized = deserializeResult(serialized);
      meshes.push(deserialized.mesh);

      // All statistics should be preserved
      expect(deserialized.result.nVertices).toBe(result.nVertices);
      expect(deserialized.result.nCells).toBe(result.nCells);
      expect(deserialized.result.nBoundaryFaces).toBe(result.nBoundaryFaces);
      expect(deserialized.result.elapsed).toBe(result.elapsed);
      expect(deserialized.result.qualityBefore).toBe(result.qualityBefore);
      expect(deserialized.result.qualityAfter).toBe(result.qualityAfter);
      expect(deserialized.result.qualityImprovement).toBe(
        result.qualityImprovement,
      );
      expect(deserialized.result.nInserted).toBe(result.nInserted);
      expect(deserialized.result.nDeleted).toBe(result.nDeleted);
      expect(deserialized.result.success).toBe(result.success);
    });
  });

  describe("Round-trip Serialization", () => {
    it("should preserve mesh data through serialize/deserialize cycle", async () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
        boundaryFaces: cubeTriangles,
      });
      meshes.push(mesh);

      const result = await mesh.remesh({ hmax: 0.4 });
      meshes.push(result.mesh);

      // Get vertex/cell data before serialization
      const originalVertices = result.mesh.vertices.slice();
      const originalCells = result.mesh.cells.slice();

      // Round-trip through serialization
      const serialized: SerializedRemeshResult = {
        mesh: serializeMesh(result.mesh),
        nVertices: result.nVertices,
        nCells: result.nCells,
        nBoundaryFaces: result.nBoundaryFaces,
        elapsed: result.elapsed,
        qualityBefore: result.qualityBefore,
        qualityAfter: result.qualityAfter,
        qualityImprovement: result.qualityImprovement,
        nInserted: result.nInserted,
        nDeleted: result.nDeleted,
        nSwapped: result.nSwapped,
        nMoved: result.nMoved,
        success: result.success,
        warnings: result.warnings,
      };

      const deserialized = deserializeResult(serialized);
      meshes.push(deserialized.mesh);

      // Vertex data should match
      const deserializedVertices = deserialized.mesh.vertices;
      expect(deserializedVertices.length).toBe(originalVertices.length);
      for (let i = 0; i < originalVertices.length; i++) {
        expect(deserializedVertices[i]).toBeCloseTo(originalVertices[i], 10);
      }

      // Cell data should match
      const deserializedCells = deserialized.mesh.cells;
      expect(deserializedCells.length).toBe(originalCells.length);
      for (let i = 0; i < originalCells.length; i++) {
        expect(deserializedCells[i]).toBe(originalCells[i]);
      }
    });
  });
});

describe("MeshWorker Class", () => {
  // Note: Web Workers don't work in Bun's test environment directly
  // These tests verify the class structure and behavior where possible

  it("should instantiate MeshWorker", () => {
    // In a non-browser environment, this will fail when trying to create
    // a Worker, but we can verify the class exists and is exported
    expect(MeshWorker).toBeDefined();
    expect(typeof MeshWorker).toBe("function");
  });

  it("should export remeshInWorker helper", () => {
    expect(remeshInWorker).toBeDefined();
    expect(typeof remeshInWorker).toBe("function");
  });
});

describe("Worker API - Direct Remesh Comparison", () => {
  // These tests verify that worker results match direct remesh results
  // by testing the serialization/deserialization logic

  const meshes: Mesh[] = [];

  beforeAll(async () => {
    await initMMG3D();
  });

  afterEach(() => {
    for (const mesh of meshes) {
      try {
        mesh.free();
      } catch {
        // Ignore
      }
    }
    meshes.length = 0;
  });

  it("should produce equivalent results through serialization", async () => {
    const mesh = new Mesh({
      vertices: cubeVertices,
      cells: cubeTetrahedra,
      boundaryFaces: cubeTriangles,
    });
    meshes.push(mesh);

    // Direct remesh
    const directResult = await mesh.remesh({ hmax: 0.3 });
    meshes.push(directResult.mesh);

    // Simulate worker path: serialize input, deserialize output
    const serializedInput = serializeMesh(mesh);

    // Recreate mesh from serialized input (as worker would)
    const workerMesh = new Mesh({
      vertices: serializedInput.vertices,
      cells: serializedInput.cells,
      type: serializedInput.type,
      boundaryFaces: serializedInput.boundaryFaces,
    });
    meshes.push(workerMesh);

    const workerResult = await workerMesh.remesh({ hmax: 0.3 });
    meshes.push(workerResult.mesh);

    // Results should be similar (not identical due to internal state differences)
    expect(workerResult.success).toBe(directResult.success);
    expect(workerResult.mesh.type).toBe(directResult.mesh.type);

    // Vertex counts should be similar (might vary slightly due to different handles)
    const vertexDiff = Math.abs(
      workerResult.nVertices - directResult.nVertices,
    );
    expect(vertexDiff).toBeLessThan(directResult.nVertices * 0.1); // Within 10%
  });
});

describe("Worker Message Types", () => {
  it("should have correct message structure types", async () => {
    // Import types to verify they compile correctly
    const types = await import("../src/worker/types");

    // These type checks verify the exports exist
    expect(types).toBeDefined();

    // Verify SerializedMeshData has required fields
    const mockMeshData: import("../src/worker/types").SerializedMeshData = {
      vertices: new Float64Array(0),
      cells: new Int32Array(0),
      type: MeshType.Mesh3D,
    };
    expect(mockMeshData.type).toBe(MeshType.Mesh3D);

    // Verify ProgressInfo has required fields
    const mockProgress: import("../src/worker/types").ProgressInfo = {
      percent: 50,
      stage: "Remeshing",
    };
    expect(mockProgress.percent).toBe(50);
    expect(mockProgress.stage).toBe("Remeshing");
  });
});
