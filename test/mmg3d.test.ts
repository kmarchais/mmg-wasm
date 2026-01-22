import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import {
  DPARAM,
  IPARAM,
  MMG3D,
  MMG_RETURN_CODES,
  type MeshHandle,
  SOL_ENTITY,
  SOL_TYPE,
  initMMG3D,
} from "../src/mmg3d";

describe("MMG3D", () => {
  // Track handles for cleanup
  const handles: MeshHandle[] = [];

  beforeAll(async () => {
    await initMMG3D();
  });

  afterEach(() => {
    // Clean up any handles created during tests
    for (const handle of handles) {
      try {
        MMG3D.free(handle);
      } catch {
        // Ignore errors from already-freed handles
      }
    }
    handles.length = 0;
  });

  describe("Initialization", () => {
    it("should initialize a mesh and return a valid handle", () => {
      const handle = MMG3D.init();
      handles.push(handle);
      expect(handle).toBeGreaterThanOrEqual(0);
    });

    it("should free a mesh successfully", () => {
      const handle = MMG3D.init();
      // Don't add to handles array since we're freeing it manually
      expect(() => MMG3D.free(handle)).not.toThrow();
    });

    it("should throw when freeing an invalid handle", () => {
      expect(() => MMG3D.free(-1 as MeshHandle)).toThrow();
    });

    it("should throw when double-freeing a handle", () => {
      const handle = MMG3D.init();
      MMG3D.free(handle);
      expect(() => MMG3D.free(handle)).toThrow();
    });

    it("should report max handles as 64", () => {
      expect(MMG3D.getMaxHandles()).toBe(64);
    });

    it("should track available handles correctly", () => {
      const initialAvailable = MMG3D.getAvailableHandles();
      const handle = MMG3D.init();
      handles.push(handle);
      expect(MMG3D.getAvailableHandles()).toBe(initialAvailable - 1);
    });
  });

  describe("Mesh Size", () => {
    it("should set and get mesh size", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      const size = MMG3D.getMeshSize(handle);
      expect(size.nVertices).toBe(4);
      expect(size.nTetrahedra).toBe(1);
      expect(size.nPrisms).toBe(0);
      expect(size.nTriangles).toBe(4);
      expect(size.nQuads).toBe(0);
      expect(size.nEdges).toBe(0);
    });
  });

  describe("Vertices", () => {
    it("should set and get a single vertex", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);
      MMG3D.setVertex(handle, 1, 0.0, 0.0, 0.0);
      MMG3D.setVertex(handle, 2, 1.0, 0.0, 0.0);
      MMG3D.setVertex(handle, 3, 0.5, 1.0, 0.0);
      MMG3D.setVertex(handle, 4, 0.5, 0.5, 1.0);

      const vertices = MMG3D.getVertices(handle);
      expect(vertices.length).toBe(12); // 4 vertices * 3 coordinates

      // Check first vertex
      expect(vertices[0]).toBeCloseTo(0.0);
      expect(vertices[1]).toBeCloseTo(0.0);
      expect(vertices[2]).toBeCloseTo(0.0);

      // Check second vertex
      expect(vertices[3]).toBeCloseTo(1.0);
      expect(vertices[4]).toBeCloseTo(0.0);
      expect(vertices[5]).toBeCloseTo(0.0);
    });

    it("should set vertices in bulk", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      const vertices = new Float64Array([
        0.0,
        0.0,
        0.0, // vertex 1
        1.0,
        0.0,
        0.0, // vertex 2
        0.5,
        1.0,
        0.0, // vertex 3
        0.5,
        0.5,
        1.0, // vertex 4
      ]);

      MMG3D.setVertices(handle, vertices);

      const result = MMG3D.getVertices(handle);
      expect(result.length).toBe(12);

      // Verify all vertices
      for (let i = 0; i < vertices.length; i++) {
        expect(result[i]).toBeCloseTo(vertices[i]);
      }
    });

    it("should set vertices with references", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      const refs = new Int32Array([1, 2, 3, 4]);

      // Should not throw
      expect(() => MMG3D.setVertices(handle, vertices, refs)).not.toThrow();
    });

    it("should throw when vertices array length is not a multiple of 3", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      const badVertices = new Float64Array([0.0, 0.0, 0.0, 1.0]); // length 4, not multiple of 3
      expect(() => MMG3D.setVertices(handle, badVertices)).toThrow(
        /must be a multiple of 3/,
      );
    });

    it("should throw when refs array length does not match vertex count", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      const badRefs = new Int32Array([1, 2]); // 2 refs for 4 vertices
      expect(() => MMG3D.setVertices(handle, vertices, badRefs)).toThrow(
        /must match number of vertices/,
      );
    });
  });

  describe("Tetrahedra", () => {
    it("should set and get a single tetrahedron", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      // Set vertices
      MMG3D.setVertex(handle, 1, 0.0, 0.0, 0.0);
      MMG3D.setVertex(handle, 2, 1.0, 0.0, 0.0);
      MMG3D.setVertex(handle, 3, 0.5, 1.0, 0.0);
      MMG3D.setVertex(handle, 4, 0.5, 0.5, 1.0);

      // Set tetrahedron (1-indexed vertices)
      MMG3D.setTetrahedron(handle, 1, 1, 2, 3, 4);

      const tetra = MMG3D.getTetrahedra(handle);
      expect(tetra.length).toBe(4); // 1 tetrahedron * 4 vertices
      expect(tetra[0]).toBe(1);
      expect(tetra[1]).toBe(2);
      expect(tetra[2]).toBe(3);
      expect(tetra[3]).toBe(4);
    });

    it("should set tetrahedra in bulk", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      // Set vertices
      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      MMG3D.setVertices(handle, vertices);

      // Set tetrahedra (1-indexed)
      const tetra = new Int32Array([1, 2, 3, 4]);
      MMG3D.setTetrahedra(handle, tetra);

      const result = MMG3D.getTetrahedra(handle);
      expect(result.length).toBe(4);
      for (let i = 0; i < tetra.length; i++) {
        expect(result[i]).toBe(tetra[i]);
      }
    });

    it("should throw when tetrahedra array length is not a multiple of 4", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      const badTetra = new Int32Array([1, 2, 3]); // length 3, not multiple of 4
      expect(() => MMG3D.setTetrahedra(handle, badTetra)).toThrow(
        /must be a multiple of 4/,
      );
    });
  });

  describe("Triangles", () => {
    it("should set and get a single triangle", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      // Set vertices
      MMG3D.setVertex(handle, 1, 0.0, 0.0, 0.0);
      MMG3D.setVertex(handle, 2, 1.0, 0.0, 0.0);
      MMG3D.setVertex(handle, 3, 0.5, 1.0, 0.0);
      MMG3D.setVertex(handle, 4, 0.5, 0.5, 1.0);

      // Set triangle (1-indexed vertices)
      MMG3D.setTriangle(handle, 1, 1, 2, 3);
      MMG3D.setTriangle(handle, 2, 1, 2, 4);
      MMG3D.setTriangle(handle, 3, 2, 3, 4);
      MMG3D.setTriangle(handle, 4, 1, 3, 4);

      const tria = MMG3D.getTriangles(handle);
      expect(tria.length).toBe(12); // 4 triangles * 3 vertices

      // Check first triangle
      expect(tria[0]).toBe(1);
      expect(tria[1]).toBe(2);
      expect(tria[2]).toBe(3);
    });

    it("should set triangles in bulk", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      // Set vertices
      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      MMG3D.setVertices(handle, vertices);

      // Set triangles (1-indexed)
      const tria = new Int32Array([
        1,
        2,
        3, // face 1
        1,
        2,
        4, // face 2
        2,
        3,
        4, // face 3
        1,
        3,
        4, // face 4
      ]);
      MMG3D.setTriangles(handle, tria);

      const result = MMG3D.getTriangles(handle);
      expect(result.length).toBe(12);
      for (let i = 0; i < tria.length; i++) {
        expect(result[i]).toBe(tria[i]);
      }
    });

    it("should throw when triangles array length is not a multiple of 3", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      const badTria = new Int32Array([1, 2]); // length 2, not multiple of 3
      expect(() => MMG3D.setTriangles(handle, badTria)).toThrow(
        /must be a multiple of 3/,
      );
    });
  });

  describe("Parameters", () => {
    it("should set integer parameters", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      // Set verbosity to silent
      expect(() => MMG3D.setIParam(handle, IPARAM.verbose, -1)).not.toThrow();
    });

    it("should set double parameters", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      // Set max edge length
      expect(() => MMG3D.setDParam(handle, DPARAM.hmax, 0.5)).not.toThrow();
    });
  });

  describe("Remeshing", () => {
    it("should remesh a simple tetrahedron", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      // Create a simple tetrahedron mesh
      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      // Set vertices (a unit tetrahedron)
      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 0.866, 0.0, 0.5, 0.289, 0.816,
      ]);
      MMG3D.setVertices(handle, vertices);

      // Set tetrahedron
      const tetra = new Int32Array([1, 2, 3, 4]);
      MMG3D.setTetrahedra(handle, tetra);

      // Set boundary triangles
      const tria = new Int32Array([
        1,
        3,
        2, // bottom face (outward normal)
        1,
        2,
        4, // front face
        2,
        3,
        4, // right face
        3,
        1,
        4, // left face
      ]);
      MMG3D.setTriangles(handle, tria);

      // Set parameters for refinement
      MMG3D.setIParam(handle, IPARAM.verbose, -1); // Silent
      MMG3D.setDParam(handle, DPARAM.hmax, 0.3); // Small edge length to trigger refinement

      // Run remeshing
      const result = MMG3D.mmg3dlib(handle);

      // Check result (0 = success)
      expect(result).toBe(MMG_RETURN_CODES.SUCCESS);

      // Verify mesh was refined (should have more vertices/tetrahedra)
      const newSize = MMG3D.getMeshSize(handle);
      expect(newSize.nVertices).toBeGreaterThan(4);
      expect(newSize.nTetrahedra).toBeGreaterThan(1);

      // Verify we can retrieve the new mesh data
      const newVertices = MMG3D.getVertices(handle);
      expect(newVertices.length).toBe(newSize.nVertices * 3);

      const newTetra = MMG3D.getTetrahedra(handle);
      expect(newTetra.length).toBe(newSize.nTetrahedra * 4);
    });
  });

  describe("Multiple Handles", () => {
    it("should work with multiple independent meshes", () => {
      const handle1 = MMG3D.init();
      const handle2 = MMG3D.init();
      handles.push(handle1, handle2);

      expect(handle1).not.toBe(handle2);

      // Set different sizes for each mesh
      MMG3D.setMeshSize(handle1, 4, 1, 0, 4, 0, 0);
      MMG3D.setMeshSize(handle2, 8, 2, 0, 8, 0, 0);

      const size1 = MMG3D.getMeshSize(handle1);
      const size2 = MMG3D.getMeshSize(handle2);

      expect(size1.nVertices).toBe(4);
      expect(size2.nVertices).toBe(8);
    });
  });

  describe("Solution/Metric Fields", () => {
    it("should set and get solution size for scalar metric", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      // Create a simple mesh first
      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      // Set solution size for scalar metric at vertices
      MMG3D.setSolSize(handle, SOL_ENTITY.VERTEX, 4, SOL_TYPE.SCALAR);

      const solInfo = MMG3D.getSolSize(handle);
      expect(solInfo.typEntity).toBe(SOL_ENTITY.VERTEX);
      expect(solInfo.nEntities).toBe(4);
      expect(solInfo.typSol).toBe(SOL_TYPE.SCALAR);
    });

    it("should set and get scalar solution values", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      // Create a simple mesh
      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      // Set vertices
      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      MMG3D.setVertices(handle, vertices);

      // Set solution size for scalar metric
      MMG3D.setSolSize(handle, SOL_ENTITY.VERTEX, 4, SOL_TYPE.SCALAR);

      // Set scalar values (desired edge length at each vertex)
      const metric = new Float64Array([0.1, 0.2, 0.15, 0.25]);
      MMG3D.setScalarSols(handle, metric);

      // Get back the values
      const result = MMG3D.getScalarSols(handle);
      expect(result.length).toBe(4);
      for (let i = 0; i < 4; i++) {
        expect(result[i]).toBeCloseTo(metric[i]);
      }
    });

    it("should set and get tensor solution values", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      // Create a simple mesh
      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      // Set vertices
      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      MMG3D.setVertices(handle, vertices);

      // Set solution size for tensor metric (6 components per vertex in 3D)
      MMG3D.setSolSize(handle, SOL_ENTITY.VERTEX, 4, SOL_TYPE.TENSOR);

      // Set tensor values: m11, m12, m13, m22, m23, m33 per vertex
      // Using identity-like metric for simplicity
      const tensorMetric = new Float64Array([
        1.0,
        0.0,
        0.0,
        1.0,
        0.0,
        1.0, // vertex 1
        2.0,
        0.0,
        0.0,
        2.0,
        0.0,
        2.0, // vertex 2
        1.5,
        0.0,
        0.0,
        1.5,
        0.0,
        1.5, // vertex 3
        1.0,
        0.0,
        0.0,
        1.0,
        0.0,
        1.0, // vertex 4
      ]);
      MMG3D.setTensorSols(handle, tensorMetric);

      // Get back the values
      const result = MMG3D.getTensorSols(handle);
      expect(result.length).toBe(4 * 6); // 4 vertices * 6 components
      for (let i = 0; i < tensorMetric.length; i++) {
        expect(result[i]).toBeCloseTo(tensorMetric[i]);
      }
    });

    it("should use scalar metric for mesh adaptation", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      // Create a simple tetrahedron mesh
      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      // Set vertices (a unit tetrahedron)
      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 0.866, 0.0, 0.5, 0.289, 0.816,
      ]);
      MMG3D.setVertices(handle, vertices);

      // Set tetrahedron
      const tetra = new Int32Array([1, 2, 3, 4]);
      MMG3D.setTetrahedra(handle, tetra);

      // Set boundary triangles
      const tria = new Int32Array([
        1,
        3,
        2, // bottom face
        1,
        2,
        4, // front face
        2,
        3,
        4, // right face
        3,
        1,
        4, // left face
      ]);
      MMG3D.setTriangles(handle, tria);

      // Set solution size for scalar metric
      MMG3D.setSolSize(handle, SOL_ENTITY.VERTEX, 4, SOL_TYPE.SCALAR);

      // Set small edge length to trigger refinement
      const metric = new Float64Array([0.2, 0.2, 0.2, 0.2]);
      MMG3D.setScalarSols(handle, metric);

      // Set parameters
      MMG3D.setIParam(handle, IPARAM.verbose, -1); // Silent

      // Run remeshing
      const result = MMG3D.mmg3dlib(handle);

      // Check result
      expect(result).toBe(MMG_RETURN_CODES.SUCCESS);

      // Verify mesh was refined
      const newSize = MMG3D.getMeshSize(handle);
      expect(newSize.nVertices).toBeGreaterThan(4);
      expect(newSize.nTetrahedra).toBeGreaterThan(1);
    });
  });
});
