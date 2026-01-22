import { describe, expect, it, beforeAll, afterEach } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Mesh, MeshType, RemeshPresets } from "../src";
import { initMMG3D } from "../src/mmg3d";
import { initMMG2D } from "../src/mmg2d";
import { initMMGS } from "../src/mmgs";
import { cubeVertices, cubeTetrahedra, cubeTriangles } from "./fixtures/cube";
import {
  squareVertices,
  squareTriangles,
  squareEdges,
} from "./fixtures/square";

describe("Mesh Class", () => {
  const meshes: Mesh[] = [];

  afterEach(() => {
    for (const mesh of meshes) {
      try {
        mesh.free();
      } catch {
        // Ignore errors from already-freed meshes
      }
    }
    meshes.length = 0;
  });

  describe("Auto-detection", () => {
    beforeAll(async () => {
      await initMMG2D();
      await initMMG3D();
      await initMMGS();
    });

    it("should detect 2D mesh from vertex dimension", () => {
      const mesh = new Mesh({
        vertices: squareVertices,
        cells: squareTriangles,
      });
      meshes.push(mesh);

      expect(mesh.type).toBe(MeshType.Mesh2D);
      expect(mesh.dimension).toBe(2);
    });

    it("should detect 3D mesh from tetrahedra", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
      });
      meshes.push(mesh);

      expect(mesh.type).toBe(MeshType.Mesh3D);
      expect(mesh.dimension).toBe(3);
    });

    it("should detect surface mesh from 3D triangles", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTriangles,
      });
      meshes.push(mesh);

      expect(mesh.type).toBe(MeshType.MeshS);
      expect(mesh.dimension).toBe(3);
    });

    it("should respect explicit type override", () => {
      // Use 3D vertices with triangles but force MeshS type
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTriangles,
        type: MeshType.MeshS,
      });
      meshes.push(mesh);

      expect(mesh.type).toBe(MeshType.MeshS);
    });
  });

  describe("Properties", () => {
    beforeAll(async () => {
      await initMMG2D();
      await initMMG3D();
      await initMMGS();
    });

    it("should return correct vertex count for 2D mesh", () => {
      const mesh = new Mesh({
        vertices: squareVertices,
        cells: squareTriangles,
        boundaryFaces: squareEdges,
      });
      meshes.push(mesh);

      expect(mesh.nVertices).toBe(4);
    });

    it("should return correct cell count for 2D mesh", () => {
      const mesh = new Mesh({
        vertices: squareVertices,
        cells: squareTriangles,
        boundaryFaces: squareEdges,
      });
      meshes.push(mesh);

      expect(mesh.nCells).toBe(2);
    });

    it("should return correct vertex count for 3D mesh", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
        boundaryFaces: cubeTriangles,
      });
      meshes.push(mesh);

      expect(mesh.nVertices).toBe(8);
    });

    it("should return correct cell count for 3D mesh", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
        boundaryFaces: cubeTriangles,
      });
      meshes.push(mesh);

      expect(mesh.nCells).toBe(6);
    });

    it("should return correct boundary face count for 3D mesh", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
        boundaryFaces: cubeTriangles,
      });
      meshes.push(mesh);

      expect(mesh.nBoundaryFaces).toBe(12);
    });

    it("should return vertex data as Float64Array", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
      });
      meshes.push(mesh);

      const vertices = mesh.vertices;
      expect(vertices).toBeInstanceOf(Float64Array);
      expect(vertices.length).toBe(24); // 8 vertices * 3 coords
    });

    it("should return cell data as Int32Array", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
      });
      meshes.push(mesh);

      const cells = mesh.cells;
      expect(cells).toBeInstanceOf(Int32Array);
      expect(cells.length).toBe(24); // 6 tetrahedra * 4 vertices
    });
  });

  describe("Mesh.create() async factory", () => {
    it("should create 2D mesh with auto-initialization", async () => {
      const mesh = await Mesh.create({
        vertices: squareVertices,
        cells: squareTriangles,
      });
      meshes.push(mesh);

      expect(mesh.type).toBe(MeshType.Mesh2D);
      expect(mesh.nVertices).toBe(4);
    });

    it("should create 3D mesh with auto-initialization", async () => {
      const mesh = await Mesh.create({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
      });
      meshes.push(mesh);

      expect(mesh.type).toBe(MeshType.Mesh3D);
      expect(mesh.nVertices).toBe(8);
    });

    it("should create surface mesh with auto-initialization", async () => {
      const mesh = await Mesh.create({
        vertices: cubeVertices,
        cells: cubeTriangles,
      });
      meshes.push(mesh);

      expect(mesh.type).toBe(MeshType.MeshS);
      expect(mesh.nVertices).toBe(8);
    });
  });

  describe("Mesh.load() from buffer", () => {
    it("should load 3D mesh from file buffer", async () => {
      const cubeMeshPath = join(__dirname, "fixtures", "cube.mesh");
      const meshData = readFileSync(cubeMeshPath);

      const mesh = await Mesh.load(meshData, { type: MeshType.Mesh3D });
      meshes.push(mesh);

      expect(mesh.type).toBe(MeshType.Mesh3D);
      expect(mesh.nVertices).toBeGreaterThan(0);
      expect(mesh.nCells).toBeGreaterThan(0);
    });

    it("should load 2D mesh from file buffer", async () => {
      const squareMeshPath = join(__dirname, "fixtures", "square.mesh");
      const meshData = readFileSync(squareMeshPath);

      const mesh = await Mesh.load(meshData, { type: MeshType.Mesh2D });
      meshes.push(mesh);

      expect(mesh.type).toBe(MeshType.Mesh2D);
      expect(mesh.nVertices).toBeGreaterThan(0);
      expect(mesh.nCells).toBeGreaterThan(0);
    });

    it("should load surface mesh from file buffer", async () => {
      const surfaceMeshPath = join(__dirname, "fixtures", "cube-surface.mesh");
      const meshData = readFileSync(surfaceMeshPath);

      const mesh = await Mesh.load(meshData, { type: MeshType.MeshS });
      meshes.push(mesh);

      expect(mesh.type).toBe(MeshType.MeshS);
      expect(mesh.nVertices).toBeGreaterThan(0);
      expect(mesh.nCells).toBeGreaterThan(0);
    });

    it("should auto-detect type from 3D mesh file", async () => {
      const cubeMeshPath = join(__dirname, "fixtures", "cube.mesh");
      const meshData = readFileSync(cubeMeshPath);

      const mesh = await Mesh.load(meshData);
      meshes.push(mesh);

      // Should detect 3D based on Tetrahedra keyword in file
      expect(mesh.type).toBe(MeshType.Mesh3D);
    });

    it("should auto-detect type from 2D mesh file", async () => {
      const squareMeshPath = join(__dirname, "fixtures", "square.mesh");
      const meshData = readFileSync(squareMeshPath);

      const mesh = await Mesh.load(meshData);
      meshes.push(mesh);

      // Should detect 2D based on Dimension 2 in file
      expect(mesh.type).toBe(MeshType.Mesh2D);
    });
  });

  describe("toArrayBuffer() export", () => {
    beforeAll(async () => {
      await initMMG3D();
    });

    it("should export mesh to ASCII format", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
        boundaryFaces: cubeTriangles,
      });
      meshes.push(mesh);

      const buffer = mesh.toArrayBuffer("mesh");

      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(0);

      // Check that it's ASCII (contains readable text)
      const text = new TextDecoder().decode(buffer);
      expect(text).toContain("Vertices");
      expect(text).toContain("Tetrahedra");
    });

    it("should export mesh to binary format", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
        boundaryFaces: cubeTriangles,
      });
      meshes.push(mesh);

      const buffer = mesh.toArrayBuffer("meshb");

      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should round-trip mesh data through export/import", async () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
        boundaryFaces: cubeTriangles,
      });
      meshes.push(mesh);

      const originalVertexCount = mesh.nVertices;
      const originalCellCount = mesh.nCells;

      // Export to buffer
      const buffer = mesh.toArrayBuffer("mesh");

      // Load from buffer
      const mesh2 = await Mesh.load(buffer, { type: MeshType.Mesh3D });
      meshes.push(mesh2);

      expect(mesh2.nVertices).toBe(originalVertexCount);
      expect(mesh2.nCells).toBe(originalCellCount);
    });
  });

  describe("free() cleanup", () => {
    beforeAll(async () => {
      await initMMG3D();
    });

    it("should release resources on free()", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
      });

      mesh.free();

      // Accessing properties after free should throw
      expect(() => mesh.nVertices).toThrow("Mesh has been disposed");
    });

    it("should allow multiple free() calls without error", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
      });

      mesh.free();
      expect(() => mesh.free()).not.toThrow();
    });

    it("should throw on property access after dispose", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
      });

      mesh.free();

      expect(() => mesh.vertices).toThrow("Mesh has been disposed");
      expect(() => mesh.cells).toThrow("Mesh has been disposed");
      expect(() => mesh.boundaryFaces).toThrow("Mesh has been disposed");
    });

    it("should throw on export after dispose", () => {
      const mesh = new Mesh({
        vertices: cubeVertices,
        cells: cubeTetrahedra,
      });

      mesh.free();

      expect(() => mesh.toArrayBuffer()).toThrow("Mesh has been disposed");
    });
  });

  describe("Error handling", () => {
    it("should throw for empty vertices array", () => {
      expect(() => {
        new Mesh({
          vertices: new Float64Array(0),
          cells: new Int32Array([1, 2, 3]),
        });
      }).toThrow();
    });

    it("should throw for empty cells array", () => {
      expect(() => {
        new Mesh({
          vertices: new Float64Array([0, 0, 0, 1, 0, 0]),
          cells: new Int32Array(0),
        });
      }).toThrow();
    });
  });

  describe("Surface mesh specific", () => {
    beforeAll(async () => {
      await initMMGS();
    });

    it("should handle surface mesh with edges", () => {
      // Simple tetrahedron surface (4 triangles)
      const vertices = new Float64Array([
        0, 0, 0, 1, 0, 0, 0.5, 0.866, 0, 0.5, 0.289, 0.816,
      ]);
      const triangles = new Int32Array([1, 2, 3, 1, 2, 4, 2, 3, 4, 3, 1, 4]);

      const mesh = new Mesh({
        vertices,
        cells: triangles,
        type: MeshType.MeshS,
      });
      meshes.push(mesh);

      expect(mesh.type).toBe(MeshType.MeshS);
      expect(mesh.dimension).toBe(3);
      expect(mesh.nVertices).toBe(4);
      expect(mesh.nCells).toBe(4);
    });
  });

  describe("remesh() method", () => {
    beforeAll(async () => {
      await initMMG2D();
      await initMMG3D();
      await initMMGS();
    });

    describe("Basic remeshing", () => {
      it("should remesh 3D mesh with default options", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.mesh).toBeInstanceOf(Mesh);
        expect(result.nVertices).toBeGreaterThan(0);
        expect(result.nCells).toBeGreaterThan(0);
        expect(result.elapsed).toBeGreaterThan(0);
      });

      it("should remesh 2D mesh with default options", async () => {
        const mesh = new Mesh({
          vertices: squareVertices,
          cells: squareTriangles,
          boundaryFaces: squareEdges,
        });
        meshes.push(mesh);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.mesh.type).toBe(MeshType.Mesh2D);
        expect(result.nVertices).toBeGreaterThan(0);
        expect(result.nCells).toBeGreaterThan(0);
      });

      it("should remesh surface mesh with default options", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTriangles,
          type: MeshType.MeshS,
        });
        meshes.push(mesh);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.mesh.type).toBe(MeshType.MeshS);
        expect(result.nVertices).toBeGreaterThan(0);
        expect(result.nCells).toBeGreaterThan(0);
      });
    });

    describe("Immutable pattern", () => {
      it("should not modify original mesh after remesh", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const originalVertexCount = mesh.nVertices;
        const originalCellCount = mesh.nCells;

        // Remesh with finer mesh settings
        const result = await mesh.remesh({ hmax: 0.2 });
        meshes.push(result.mesh);

        // Original mesh should be unchanged
        expect(mesh.nVertices).toBe(originalVertexCount);
        expect(mesh.nCells).toBe(originalCellCount);

        // Result mesh should be different
        expect(result.nVertices).toBeGreaterThan(originalVertexCount);
      });

      it("should allow multiple remesh calls on same mesh", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const result1 = await mesh.remesh({ hmax: 0.3 });
        const result2 = await mesh.remesh({ hmax: 0.5 });
        meshes.push(result1.mesh, result2.mesh);

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);

        // Both results should be valid
        expect(result1.nVertices).toBeGreaterThan(0);
        expect(result2.nVertices).toBeGreaterThan(0);
      });
    });

    describe("Quality metrics", () => {
      it("should compute quality metrics", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        // Quality values should be between 0 and 1
        expect(result.qualityBefore).toBeGreaterThanOrEqual(0);
        expect(result.qualityBefore).toBeLessThanOrEqual(1);
        expect(result.qualityAfter).toBeGreaterThanOrEqual(0);
        expect(result.qualityAfter).toBeLessThanOrEqual(1);

        // Quality improvement should be a positive number or Infinity
        expect(result.qualityImprovement).toBeGreaterThan(0);
      });

      it("should improve quality with optimization mode", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const result = await mesh.remesh(RemeshPresets.optimizeOnly());
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        // Quality should not decrease significantly
        expect(result.qualityAfter).toBeGreaterThanOrEqual(result.qualityBefore * 0.9);
      });
    });

    describe("Remesh with options", () => {
      it("should create finer mesh with small hmax", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const coarseResult = await mesh.remesh({ hmax: 0.5 });
        const fineResult = await mesh.remesh({ hmax: 0.2 });
        meshes.push(coarseResult.mesh, fineResult.mesh);

        // Finer mesh should have more elements
        expect(fineResult.nVertices).toBeGreaterThan(coarseResult.nVertices);
        expect(fineResult.nCells).toBeGreaterThan(coarseResult.nCells);
      });

      it("should use RemeshPresets", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const result = await mesh.remesh(RemeshPresets.default());
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(0);
      });

      it("should respect noinsert option", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const originalVertexCount = mesh.nVertices;
        const result = await mesh.remesh(RemeshPresets.noInsertions());
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        // With noinsert, vertex count should not increase
        expect(result.nVertices).toBeLessThanOrEqual(originalVertexCount);
      });
    });

    describe("Result structure", () => {
      it("should return complete RemeshResult structure", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        // Check all required fields exist
        expect(result.mesh).toBeDefined();
        expect(typeof result.nVertices).toBe("number");
        expect(typeof result.nCells).toBe("number");
        expect(typeof result.nBoundaryFaces).toBe("number");
        expect(typeof result.elapsed).toBe("number");
        expect(typeof result.qualityBefore).toBe("number");
        expect(typeof result.qualityAfter).toBe("number");
        expect(typeof result.qualityImprovement).toBe("number");
        expect(typeof result.nInserted).toBe("number");
        expect(typeof result.nDeleted).toBe("number");
        expect(typeof result.nSwapped).toBe("number");
        expect(typeof result.nMoved).toBe("number");
        expect(typeof result.success).toBe("boolean");
        expect(Array.isArray(result.warnings)).toBe(true);
      });

      it("should compute vertex insertion/deletion stats", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        // Fine mesh should insert vertices
        const fineResult = await mesh.remesh({ hmax: 0.2 });
        meshes.push(fineResult.mesh);

        expect(fineResult.nInserted).toBeGreaterThan(0);
        expect(fineResult.nDeleted).toBe(0);
      });

      it("should record elapsed time", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.elapsed).toBeGreaterThan(0);
      });
    });

    describe("Error handling", () => {
      it("should throw on disposed mesh", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });

        mesh.free();

        await expect(mesh.remesh()).rejects.toThrow("Mesh has been disposed");
      });
    });

    describe("Result mesh usability", () => {
      it("should allow further remeshing on result mesh", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const result1 = await mesh.remesh({ hmax: 0.4 });
        meshes.push(result1.mesh);

        const result2 = await result1.mesh.remesh({ hmax: 0.3 });
        meshes.push(result2.mesh);

        expect(result2.success).toBe(true);
        expect(result2.nVertices).toBeGreaterThan(result1.nVertices);
      });

      it("should allow export of result mesh", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        const buffer = result.mesh.toArrayBuffer("mesh");
        expect(buffer).toBeInstanceOf(Uint8Array);
        expect(buffer.length).toBeGreaterThan(0);
      });

      it("should allow accessing vertices/cells of result mesh", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        const vertices = result.mesh.vertices;
        const cells = result.mesh.cells;

        expect(vertices).toBeInstanceOf(Float64Array);
        expect(cells).toBeInstanceOf(Int32Array);
        expect(vertices.length).toBe(result.nVertices * 3);
        expect(cells.length).toBe(result.nCells * 4); // tetrahedra have 4 vertices
      });
    });

    describe("Local refinement", () => {
      it("should refine 3D mesh in spherical region", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const originalVertexCount = mesh.nVertices;

        // Refine around center of cube
        mesh.setSizeSphere([0.5, 0.5, 0.5], 0.3, 0.1);
        expect(mesh.localSizeCount).toBe(1);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(originalVertexCount);
      });

      it("should refine 3D mesh in box region", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const originalVertexCount = mesh.nVertices;

        // Refine in a corner of the cube
        mesh.setSizeBox([0, 0, 0], [0.3, 0.3, 0.3], 0.1);
        expect(mesh.localSizeCount).toBe(1);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(originalVertexCount);
      });

      it("should refine 3D mesh in cylindrical region", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        const originalVertexCount = mesh.nVertices;

        // Refine along a cylinder through the cube
        mesh.setSizeCylinder([0, 0.5, 0.5], [1, 0.5, 0.5], 0.2, 0.1);
        expect(mesh.localSizeCount).toBe(1);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(originalVertexCount);
      });

      it("should refine 2D mesh in circular region", async () => {
        const mesh = new Mesh({
          vertices: squareVertices,
          cells: squareTriangles,
          boundaryFaces: squareEdges,
        });
        meshes.push(mesh);

        const originalVertexCount = mesh.nVertices;

        // Refine around center of square
        mesh.setSizeCircle([0.5, 0.5], 0.3, 0.1);
        expect(mesh.localSizeCount).toBe(1);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(originalVertexCount);
      });

      it("should refine 2D mesh in box region", async () => {
        const mesh = new Mesh({
          vertices: squareVertices,
          cells: squareTriangles,
          boundaryFaces: squareEdges,
        });
        meshes.push(mesh);

        const originalVertexCount = mesh.nVertices;

        // Refine in a corner of the square
        mesh.setSizeBox([0, 0], [0.3, 0.3], 0.1);
        expect(mesh.localSizeCount).toBe(1);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(originalVertexCount);
      });

      it("should combine multiple constraints", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        // Add multiple refinement regions
        mesh
          .setSizeSphere([0.5, 0.5, 0.5], 0.2, 0.1)
          .setSizeBox([0.8, 0.8, 0.8], [1, 1, 1], 0.08);

        expect(mesh.localSizeCount).toBe(2);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
      });

      it("should support method chaining", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        // Fluent API should work
        const returned = mesh
          .setSizeSphere([0.5, 0.5, 0.5], 0.2, 0.1)
          .setSizeBox([0, 0, 0], [0.3, 0.3, 0.3], 0.15)
          .setSizeCylinder([0, 0.5, 0.5], [1, 0.5, 0.5], 0.1, 0.12);

        expect(returned).toBe(mesh);
        expect(mesh.localSizeCount).toBe(3);
      });

      it("should clear local sizes", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
          boundaryFaces: cubeTriangles,
        });
        meshes.push(mesh);

        mesh.setSizeSphere([0.5, 0.5, 0.5], 0.2, 0.1);
        expect(mesh.localSizeCount).toBe(1);

        mesh.clearLocalSizes();
        expect(mesh.localSizeCount).toBe(0);
      });

      it("should throw for setSizeSphere on 2D mesh", () => {
        const mesh = new Mesh({
          vertices: squareVertices,
          cells: squareTriangles,
        });
        meshes.push(mesh);

        expect(() => mesh.setSizeSphere([0.5, 0.5, 0.5], 0.2, 0.1)).toThrow(
          /only available for 3D meshes/,
        );
      });

      it("should throw for setSizeCircle on 3D mesh", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        meshes.push(mesh);

        expect(() => mesh.setSizeCircle([0.5, 0.5], 0.2, 0.1)).toThrow(
          /only available for 2D meshes/,
        );
      });

      it("should throw for setSizeCylinder on 2D mesh", () => {
        const mesh = new Mesh({
          vertices: squareVertices,
          cells: squareTriangles,
        });
        meshes.push(mesh);

        expect(() =>
          mesh.setSizeCylinder([0, 0, 0], [1, 0, 0], 0.2, 0.1),
        ).toThrow(/only available for 3D meshes/);
      });

      it("should throw for wrong dimension box on 3D mesh", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        meshes.push(mesh);

        expect(() =>
          mesh.setSizeBox([0, 0] as [number, number], [1, 1] as [number, number], 0.1),
        ).toThrow(/must have 3 dimensions/);
      });

      it("should throw for wrong dimension box on 2D mesh", () => {
        const mesh = new Mesh({
          vertices: squareVertices,
          cells: squareTriangles,
        });
        meshes.push(mesh);

        expect(() =>
          mesh.setSizeBox(
            [0, 0, 0] as [number, number, number],
            [1, 1, 1] as [number, number, number],
            0.1,
          ),
        ).toThrow(/must have 2 dimensions/);
      });

      it("should throw for invalid sphere parameters", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        meshes.push(mesh);

        expect(() => mesh.setSizeSphere([0.5, 0.5, 0.5], -1, 0.1)).toThrow(
          /radius must be positive/,
        );
        expect(() => mesh.setSizeSphere([0.5, 0.5, 0.5], 0.2, -0.1)).toThrow(
          /size must be positive/,
        );
      });

      it("should throw for invalid box parameters", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        meshes.push(mesh);

        expect(() =>
          mesh.setSizeBox([0.5, 0.5, 0.5], [0.3, 0.3, 0.3], 0.1),
        ).toThrow(/min must be less than max/);
      });

      it("should throw for local sizing after dispose", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });

        mesh.free();

        expect(() => mesh.setSizeSphere([0.5, 0.5, 0.5], 0.2, 0.1)).toThrow(
          /disposed/,
        );
      });

      it("should work with surface mesh", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTriangles,
          type: MeshType.MeshS,
        });
        meshes.push(mesh);

        const originalVertexCount = mesh.nVertices;

        mesh.setSizeSphere([0.5, 0.5, 0.5], 0.3, 0.1);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(originalVertexCount);
      });
    });

    describe("setMetric()", () => {
      it("should set isotropic metric on 3D mesh", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        meshes.push(mesh);

        const metric = new Float64Array(mesh.nVertices);
        for (let i = 0; i < mesh.nVertices; i++) {
          metric[i] = 0.2;
        }

        mesh.setMetric(metric);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(mesh.nVertices);
      });

      it("should set isotropic metric on 2D mesh", async () => {
        const mesh = new Mesh({
          vertices: squareVertices,
          cells: squareTriangles,
        });
        meshes.push(mesh);

        const metric = new Float64Array(mesh.nVertices);
        for (let i = 0; i < mesh.nVertices; i++) {
          metric[i] = 0.2;
        }

        mesh.setMetric(metric);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(mesh.nVertices);
      });

      it("should set isotropic metric on surface mesh", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTriangles,
          type: MeshType.MeshS,
        });
        meshes.push(mesh);

        const metric = new Float64Array(mesh.nVertices);
        for (let i = 0; i < mesh.nVertices; i++) {
          metric[i] = 0.2;
        }

        mesh.setMetric(metric);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(mesh.nVertices);
      });

      it("should throw for wrong metric array length", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        meshes.push(mesh);

        const wrongMetric = new Float64Array(5);
        expect(() => mesh.setMetric(wrongMetric)).toThrow(/must match/);
      });

      it("should throw after dispose", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        const nVertices = mesh.nVertices;
        mesh.free();

        const metric = new Float64Array(nVertices);
        expect(() => mesh.setMetric(metric)).toThrow(/disposed/);
      });

      it("should support method chaining", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        meshes.push(mesh);

        const metric = new Float64Array(mesh.nVertices).fill(0.2);
        const result = mesh.setMetric(metric);
        expect(result).toBe(mesh);
      });
    });

    describe("setMetricTensor()", () => {
      it("should set anisotropic tensor metric on 3D mesh", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        meshes.push(mesh);

        const tensor = new Float64Array(mesh.nVertices * 6);
        for (let i = 0; i < mesh.nVertices; i++) {
          const idx = i * 6;
          tensor[idx + 0] = 25.0; // m11
          tensor[idx + 1] = 0.0; // m12
          tensor[idx + 2] = 0.0; // m13
          tensor[idx + 3] = 25.0; // m22
          tensor[idx + 4] = 0.0; // m23
          tensor[idx + 5] = 25.0; // m33
        }

        mesh.setMetricTensor(tensor);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(mesh.nVertices);
      });

      it("should set anisotropic tensor metric on 2D mesh", async () => {
        const mesh = new Mesh({
          vertices: squareVertices,
          cells: squareTriangles,
        });
        meshes.push(mesh);

        const tensor = new Float64Array(mesh.nVertices * 3);
        for (let i = 0; i < mesh.nVertices; i++) {
          const idx = i * 3;
          tensor[idx + 0] = 25.0; // m11
          tensor[idx + 1] = 0.0; // m12
          tensor[idx + 2] = 25.0; // m22
        }

        mesh.setMetricTensor(tensor);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(mesh.nVertices);
      });

      it("should set anisotropic tensor metric on surface mesh", async () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTriangles,
          type: MeshType.MeshS,
        });
        meshes.push(mesh);

        const tensor = new Float64Array(mesh.nVertices * 6);
        for (let i = 0; i < mesh.nVertices; i++) {
          const idx = i * 6;
          tensor[idx + 0] = 25.0;
          tensor[idx + 1] = 0.0;
          tensor[idx + 2] = 0.0;
          tensor[idx + 3] = 25.0;
          tensor[idx + 4] = 0.0;
          tensor[idx + 5] = 25.0;
        }

        mesh.setMetricTensor(tensor);

        const result = await mesh.remesh();
        meshes.push(result.mesh);

        expect(result.success).toBe(true);
        expect(result.nVertices).toBeGreaterThan(mesh.nVertices);
      });

      it("should throw for wrong tensor array length (3D)", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        meshes.push(mesh);

        const wrongTensor = new Float64Array(mesh.nVertices * 3);
        expect(() => mesh.setMetricTensor(wrongTensor)).toThrow(
          /6 components/,
        );
      });

      it("should throw for wrong tensor array length (2D)", () => {
        const mesh = new Mesh({
          vertices: squareVertices,
          cells: squareTriangles,
        });
        meshes.push(mesh);

        const wrongTensor = new Float64Array(mesh.nVertices * 6);
        expect(() => mesh.setMetricTensor(wrongTensor)).toThrow(
          /3 components/,
        );
      });

      it("should throw after dispose", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        const nVertices = mesh.nVertices;
        mesh.free();

        const tensor = new Float64Array(nVertices * 6);
        expect(() => mesh.setMetricTensor(tensor)).toThrow(/disposed/);
      });

      it("should support method chaining", () => {
        const mesh = new Mesh({
          vertices: cubeVertices,
          cells: cubeTetrahedra,
        });
        meshes.push(mesh);

        const tensor = new Float64Array(mesh.nVertices * 6);
        const result = mesh.setMetricTensor(tensor);
        expect(result).toBe(mesh);
      });
    });
  });
});
