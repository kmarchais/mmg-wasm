import { describe, expect, it, beforeAll, afterEach } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Mesh, MeshType } from "../src/mesh";
import { initMMG3D } from "../src/mmg3d";
import { initMMG2D } from "../src/mmg2d";
import { initMMGS } from "../src/mmgs";
import {
  cubeVertices,
  cubeTetrahedra,
  cubeTriangles,
} from "./fixtures/cube";
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
        0, 0, 0,
        1, 0, 0,
        0.5, 0.866, 0,
        0.5, 0.289, 0.816,
      ]);
      const triangles = new Int32Array([
        1, 2, 3,
        1, 2, 4,
        2, 3, 4,
        3, 1, 4,
      ]);

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
});
