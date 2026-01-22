import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import {
  DPARAM_S,
  IPARAM_S,
  MMGS,
  MMG_RETURN_CODES_S,
  SOL_ENTITY_S,
  SOL_TYPE_S,
  type MeshHandleS,
  initMMGS,
} from "../src/mmgs";

describe("MMGS", () => {
  // Track handles for cleanup
  const handles: MeshHandleS[] = [];

  beforeAll(async () => {
    await initMMGS();
  });

  afterEach(() => {
    // Clean up any handles created during tests
    for (const handle of handles) {
      try {
        MMGS.free(handle);
      } catch {
        // Ignore errors from already-freed handles
      }
    }
    handles.length = 0;
  });

  describe("Initialization", () => {
    it("should initialize a mesh and return a valid handle", () => {
      const handle = MMGS.init();
      handles.push(handle);
      expect(handle).toBeGreaterThanOrEqual(0);
    });

    it("should free a mesh successfully", () => {
      const handle = MMGS.init();
      // Don't add to handles array since we're freeing it manually
      expect(() => MMGS.free(handle)).not.toThrow();
    });

    it("should throw when freeing an invalid handle", () => {
      expect(() => MMGS.free(-1 as MeshHandleS)).toThrow();
    });

    it("should throw when double-freeing a handle", () => {
      const handle = MMGS.init();
      MMGS.free(handle);
      expect(() => MMGS.free(handle)).toThrow();
    });

    it("should report max handles as 64", () => {
      expect(MMGS.getMaxHandles()).toBe(64);
    });

    it("should track available handles correctly", () => {
      const initialAvailable = MMGS.getAvailableHandles();
      const handle = MMGS.init();
      handles.push(handle);
      expect(MMGS.getAvailableHandles()).toBe(initialAvailable - 1);
    });
  });

  describe("Mesh Size", () => {
    it("should set and get mesh size", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

      const size = MMGS.getMeshSize(handle);
      expect(size.nVertices).toBe(4);
      expect(size.nTriangles).toBe(4);
      // Note: nEdges may be 0 until edges are actually set
    });

    it("should report correct edge count after setting edges", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

      // Set vertices (tetrahedron surface)
      const vertices = new Float64Array([
        0.0,
        0.0,
        0.0, // v1
        1.0,
        0.0,
        0.0, // v2
        0.5,
        1.0,
        0.0, // v3
        0.5,
        0.5,
        1.0, // v4 (apex)
      ]);
      MMGS.setVertices(handle, vertices);

      // Set edges (6 edges of tetrahedron)
      const edges = new Int32Array([
        1,
        2, // base edge 1
        2,
        3, // base edge 2
        3,
        1, // base edge 3
        1,
        4, // apex edge 1
        2,
        4, // apex edge 2
        3,
        4, // apex edge 3
      ]);
      MMGS.setEdges(handle, edges);

      const size = MMGS.getMeshSize(handle);
      expect(size.nEdges).toBe(6);
    });
  });

  describe("Vertices", () => {
    it("should set and get a single vertex with 3D coordinates", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);
      MMGS.setVertex(handle, 1, 0.0, 0.0, 0.0);
      MMGS.setVertex(handle, 2, 1.0, 0.0, 0.0);
      MMGS.setVertex(handle, 3, 0.5, 1.0, 0.0);
      MMGS.setVertex(handle, 4, 0.5, 0.5, 1.0);

      const vertices = MMGS.getVertices(handle);
      expect(vertices.length).toBe(12); // 4 vertices * 3 coordinates

      // Check first vertex
      expect(vertices[0]).toBeCloseTo(0.0);
      expect(vertices[1]).toBeCloseTo(0.0);
      expect(vertices[2]).toBeCloseTo(0.0);

      // Check fourth vertex (apex)
      expect(vertices[9]).toBeCloseTo(0.5);
      expect(vertices[10]).toBeCloseTo(0.5);
      expect(vertices[11]).toBeCloseTo(1.0);
    });

    it("should set vertices in bulk with 3D coordinates", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

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
        1.0, // vertex 4 (apex)
      ]);

      MMGS.setVertices(handle, vertices);

      const result = MMGS.getVertices(handle);
      expect(result.length).toBe(12);

      // Verify all vertices
      for (let i = 0; i < vertices.length; i++) {
        expect(result[i]).toBeCloseTo(vertices[i]);
      }
    });

    it("should set vertices with references", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      const refs = new Int32Array([1, 2, 3, 4]);

      // Should not throw
      expect(() => MMGS.setVertices(handle, vertices, refs)).not.toThrow();
    });

    it("should throw when vertices array length is not a multiple of 3", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

      const badVertices = new Float64Array([0.0, 0.0, 1.0, 0.0]); // length 4, not multiple of 3
      expect(() => MMGS.setVertices(handle, badVertices)).toThrow(
        /must be a multiple of 3/,
      );
    });

    it("should throw when refs array length does not match vertex count", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      const badRefs = new Int32Array([1, 2]); // 2 refs for 4 vertices
      expect(() => MMGS.setVertices(handle, vertices, badRefs)).toThrow(
        /must match number of vertices/,
      );
    });
  });

  describe("Triangles", () => {
    it("should set and get a single triangle", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

      // Set vertices (tetrahedron)
      MMGS.setVertex(handle, 1, 0.0, 0.0, 0.0);
      MMGS.setVertex(handle, 2, 1.0, 0.0, 0.0);
      MMGS.setVertex(handle, 3, 0.5, 1.0, 0.0);
      MMGS.setVertex(handle, 4, 0.5, 0.5, 1.0);

      // Set triangles (1-indexed vertices)
      MMGS.setTriangle(handle, 1, 1, 2, 3); // base
      MMGS.setTriangle(handle, 2, 1, 2, 4); // front
      MMGS.setTriangle(handle, 3, 2, 3, 4); // right
      MMGS.setTriangle(handle, 4, 3, 1, 4); // left

      const tria = MMGS.getTriangles(handle);
      expect(tria.length).toBe(12); // 4 triangles * 3 vertices

      // Check first triangle
      expect(tria[0]).toBe(1);
      expect(tria[1]).toBe(2);
      expect(tria[2]).toBe(3);
    });

    it("should set triangles in bulk", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

      // Set vertices
      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      MMGS.setVertices(handle, vertices);

      // Set triangles (1-indexed) - tetrahedron surface
      const tria = new Int32Array([
        1,
        2,
        3, // base
        1,
        2,
        4, // front
        2,
        3,
        4, // right
        3,
        1,
        4, // left
      ]);
      MMGS.setTriangles(handle, tria);

      const result = MMGS.getTriangles(handle);
      expect(result.length).toBe(12);
      for (let i = 0; i < tria.length; i++) {
        expect(result[i]).toBe(tria[i]);
      }
    });

    it("should throw when triangles array length is not a multiple of 3", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

      const badTria = new Int32Array([1, 2]); // length 2, not multiple of 3
      expect(() => MMGS.setTriangles(handle, badTria)).toThrow(
        /must be a multiple of 3/,
      );
    });
  });

  describe("Edges", () => {
    it("should set and get a single edge", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

      // Set vertices
      MMGS.setVertex(handle, 1, 0.0, 0.0, 0.0);
      MMGS.setVertex(handle, 2, 1.0, 0.0, 0.0);
      MMGS.setVertex(handle, 3, 0.5, 1.0, 0.0);
      MMGS.setVertex(handle, 4, 0.5, 0.5, 1.0);

      // Set edges (1-indexed vertices)
      MMGS.setEdge(handle, 1, 1, 2);
      MMGS.setEdge(handle, 2, 2, 3);
      MMGS.setEdge(handle, 3, 3, 1);
      MMGS.setEdge(handle, 4, 1, 4);
      MMGS.setEdge(handle, 5, 2, 4);
      MMGS.setEdge(handle, 6, 3, 4);

      const edges = MMGS.getEdges(handle);
      expect(edges.length).toBe(12); // 6 edges * 2 vertices

      // Check first edge
      expect(edges[0]).toBe(1);
      expect(edges[1]).toBe(2);
    });

    it("should set edges in bulk", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

      // Set vertices
      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      MMGS.setVertices(handle, vertices);

      // Set edges (1-indexed)
      const edges = new Int32Array([
        1,
        2, // base edge 1
        2,
        3, // base edge 2
        3,
        1, // base edge 3
        1,
        4, // apex edge 1
        2,
        4, // apex edge 2
        3,
        4, // apex edge 3
      ]);
      MMGS.setEdges(handle, edges);

      const result = MMGS.getEdges(handle);
      expect(result.length).toBe(12);
      for (let i = 0; i < edges.length; i++) {
        expect(result[i]).toBe(edges[i]);
      }
    });

    it("should throw when edges array length is not a multiple of 2", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setMeshSize(handle, 4, 4, 6);

      const badEdges = new Int32Array([1]); // length 1, not multiple of 2
      expect(() => MMGS.setEdges(handle, badEdges)).toThrow(
        /must be a multiple of 2/,
      );
    });
  });

  describe("Parameters", () => {
    it("should set integer parameters", () => {
      const handle = MMGS.init();
      handles.push(handle);

      // Set verbosity to silent
      expect(() => MMGS.setIParam(handle, IPARAM_S.verbose, -1)).not.toThrow();
    });

    it("should set double parameters", () => {
      const handle = MMGS.init();
      handles.push(handle);

      // Set max edge length
      expect(() => MMGS.setDParam(handle, DPARAM_S.hmax, 0.5)).not.toThrow();
    });
  });

  describe("Remeshing", () => {
    it("should remesh a tetrahedron surface mesh", () => {
      const handle = MMGS.init();
      handles.push(handle);

      // Create a simple tetrahedron surface mesh
      MMGS.setMeshSize(handle, 4, 4, 6);

      // Set vertices (tetrahedron in 3D)
      const vertices = new Float64Array([
        0.0,
        0.0,
        0.0, // 1
        1.0,
        0.0,
        0.0, // 2
        0.5,
        1.0,
        0.0, // 3
        0.5,
        0.5,
        1.0, // 4 (apex)
      ]);
      MMGS.setVertices(handle, vertices);

      // Set triangles (surface faces)
      const tria = new Int32Array([
        1,
        3,
        2, // base (reversed for outward normal)
        1,
        2,
        4, // front
        2,
        3,
        4, // right
        3,
        1,
        4, // left
      ]);
      MMGS.setTriangles(handle, tria);

      // Set edges (optional but helps define ridges)
      const edges = new Int32Array([
        1,
        2, // base edges
        2,
        3,
        3,
        1,
        1,
        4, // apex edges
        2,
        4,
        3,
        4,
      ]);
      MMGS.setEdges(handle, edges);

      // Set parameters for refinement
      MMGS.setIParam(handle, IPARAM_S.verbose, -1); // Silent
      MMGS.setDParam(handle, DPARAM_S.hmax, 0.3); // Small edge length to trigger refinement

      // Run remeshing
      const result = MMGS.mmgslib(handle);

      // Check result (0 = success)
      expect(result).toBe(MMG_RETURN_CODES_S.SUCCESS);

      // Verify mesh was refined (should have more vertices/triangles)
      const newSize = MMGS.getMeshSize(handle);
      expect(newSize.nVertices).toBeGreaterThan(4);
      expect(newSize.nTriangles).toBeGreaterThan(4);

      // Verify we can retrieve the new mesh data
      const newVertices = MMGS.getVertices(handle);
      expect(newVertices.length).toBe(newSize.nVertices * 3);

      const newTria = MMGS.getTriangles(handle);
      expect(newTria.length).toBe(newSize.nTriangles * 3);
    });

    it("should produce more triangles with smaller hmax parameter", () => {
      // Test that smaller hmax value results in more triangles
      // (finer mesh resolution)

      // Helper to create and remesh tetrahedron with given hmax
      const createAndRemesh = (hmax: number): number => {
        const handle = MMGS.init();
        handles.push(handle);

        MMGS.setMeshSize(handle, 4, 4, 6);

        const vertices = new Float64Array([
          0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
        ]);
        MMGS.setVertices(handle, vertices);

        const tria = new Int32Array([
          1,
          3,
          2, // base
          1,
          2,
          4, // front
          2,
          3,
          4, // right
          3,
          1,
          4, // left
        ]);
        MMGS.setTriangles(handle, tria);

        const edges = new Int32Array([1, 2, 2, 3, 3, 1, 1, 4, 2, 4, 3, 4]);
        MMGS.setEdges(handle, edges);

        MMGS.setIParam(handle, IPARAM_S.verbose, -1);
        MMGS.setDParam(handle, DPARAM_S.hmax, hmax);

        const result = MMGS.mmgslib(handle);
        expect(result).toBe(MMG_RETURN_CODES_S.SUCCESS);

        return MMGS.getMeshSize(handle).nTriangles;
      };

      // Coarse mesh (larger hmax = larger elements)
      const nTrianglesCoarse = createAndRemesh(0.5);

      // Fine mesh (smaller hmax = smaller elements = more triangles)
      const nTrianglesFine = createAndRemesh(0.2);

      // Smaller hmax = more triangles
      expect(nTrianglesFine).toBeGreaterThan(nTrianglesCoarse);
    });
  });

  describe("Multiple Handles", () => {
    it("should work with multiple independent meshes", () => {
      const handle1 = MMGS.init();
      const handle2 = MMGS.init();
      handles.push(handle1, handle2);

      expect(handle1).not.toBe(handle2);

      // Set different sizes for each mesh
      MMGS.setMeshSize(handle1, 4, 4, 6);
      MMGS.setMeshSize(handle2, 8, 8, 12);

      const size1 = MMGS.getMeshSize(handle1);
      const size2 = MMGS.getMeshSize(handle2);

      expect(size1.nVertices).toBe(4);
      expect(size2.nVertices).toBe(8);
    });
  });

  describe("Solution/Metric Fields", () => {
    it("should set and get solution size for scalar metric", () => {
      const handle = MMGS.init();
      handles.push(handle);

      // Create a simple mesh first
      MMGS.setMeshSize(handle, 4, 4, 6);

      // Set solution size for scalar metric at vertices
      MMGS.setSolSize(handle, SOL_ENTITY_S.VERTEX, 4, SOL_TYPE_S.SCALAR);

      const solInfo = MMGS.getSolSize(handle);
      expect(solInfo.typEntity).toBe(SOL_ENTITY_S.VERTEX);
      expect(solInfo.nEntities).toBe(4);
      expect(solInfo.typSol).toBe(SOL_TYPE_S.SCALAR);
    });

    it("should set and get scalar solution values", () => {
      const handle = MMGS.init();
      handles.push(handle);

      // Create a simple surface mesh
      MMGS.setMeshSize(handle, 4, 4, 6);

      // Set vertices (tetrahedron surface)
      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      MMGS.setVertices(handle, vertices);

      // Set solution size for scalar metric
      MMGS.setSolSize(handle, SOL_ENTITY_S.VERTEX, 4, SOL_TYPE_S.SCALAR);

      // Set scalar values (desired edge length at each vertex)
      const metric = new Float64Array([0.1, 0.2, 0.15, 0.25]);
      MMGS.setScalarSols(handle, metric);

      // Get back the values
      const result = MMGS.getScalarSols(handle);
      expect(result.length).toBe(4);
      for (let i = 0; i < 4; i++) {
        expect(result[i]).toBeCloseTo(metric[i]);
      }
    });

    it("should set and get tensor solution values", () => {
      const handle = MMGS.init();
      handles.push(handle);

      // Create a simple surface mesh
      MMGS.setMeshSize(handle, 4, 4, 6);

      // Set vertices
      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      MMGS.setVertices(handle, vertices);

      // Set solution size for tensor metric (6 components per vertex for 3D surface)
      MMGS.setSolSize(handle, SOL_ENTITY_S.VERTEX, 4, SOL_TYPE_S.TENSOR);

      // Set tensor values: m11, m12, m13, m22, m23, m33 per vertex
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
      MMGS.setTensorSols(handle, tensorMetric);

      // Get back the values
      const result = MMGS.getTensorSols(handle);
      expect(result.length).toBe(4 * 6); // 4 vertices * 6 components
      for (let i = 0; i < tensorMetric.length; i++) {
        expect(result[i]).toBeCloseTo(tensorMetric[i]);
      }
    });

    it("should use scalar metric for mesh adaptation", () => {
      const handle = MMGS.init();
      handles.push(handle);

      // Create a simple tetrahedron surface mesh
      MMGS.setMeshSize(handle, 4, 4, 6);

      // Set vertices (tetrahedron in 3D)
      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      MMGS.setVertices(handle, vertices);

      // Set triangles (surface faces)
      const tria = new Int32Array([
        1,
        3,
        2, // base
        1,
        2,
        4, // front
        2,
        3,
        4, // right
        3,
        1,
        4, // left
      ]);
      MMGS.setTriangles(handle, tria);

      // Set edges
      const edges = new Int32Array([1, 2, 2, 3, 3, 1, 1, 4, 2, 4, 3, 4]);
      MMGS.setEdges(handle, edges);

      // Set solution size for scalar metric
      MMGS.setSolSize(handle, SOL_ENTITY_S.VERTEX, 4, SOL_TYPE_S.SCALAR);

      // Set small edge length to trigger refinement
      const metric = new Float64Array([0.2, 0.2, 0.2, 0.2]);
      MMGS.setScalarSols(handle, metric);

      // Set parameters
      MMGS.setIParam(handle, IPARAM_S.verbose, -1); // Silent

      // Run remeshing
      const result = MMGS.mmgslib(handle);

      // Check result
      expect(result).toBe(MMG_RETURN_CODES_S.SUCCESS);

      // Verify mesh was refined
      const newSize = MMGS.getMeshSize(handle);
      expect(newSize.nVertices).toBeGreaterThan(4);
      expect(newSize.nTriangles).toBeGreaterThan(4);
    });
  });
});
