import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import {
  DPARAM_2D,
  IPARAM_2D,
  MMG2D,
  MMG_RETURN_CODES_2D,
  type MeshHandle2D,
  initMMG2D,
} from "../src/mmg2d";

describe("MMG2D", () => {
  // Track handles for cleanup
  const handles: MeshHandle2D[] = [];

  beforeAll(async () => {
    await initMMG2D();
  });

  afterEach(() => {
    // Clean up any handles created during tests
    for (const handle of handles) {
      try {
        MMG2D.free(handle);
      } catch {
        // Ignore errors from already-freed handles
      }
    }
    handles.length = 0;
  });

  describe("Initialization", () => {
    it("should initialize a mesh and return a valid handle", () => {
      const handle = MMG2D.init();
      handles.push(handle);
      expect(handle).toBeGreaterThanOrEqual(0);
    });

    it("should free a mesh successfully", () => {
      const handle = MMG2D.init();
      // Don't add to handles array since we're freeing it manually
      expect(() => MMG2D.free(handle)).not.toThrow();
    });

    it("should throw when freeing an invalid handle", () => {
      expect(() => MMG2D.free(-1 as MeshHandle2D)).toThrow();
    });

    it("should throw when double-freeing a handle", () => {
      const handle = MMG2D.init();
      MMG2D.free(handle);
      expect(() => MMG2D.free(handle)).toThrow();
    });

    it("should report max handles as 64", () => {
      expect(MMG2D.getMaxHandles()).toBe(64);
    });

    it("should track available handles correctly", () => {
      const initialAvailable = MMG2D.getAvailableHandles();
      const handle = MMG2D.init();
      handles.push(handle);
      expect(MMG2D.getAvailableHandles()).toBe(initialAvailable - 1);
    });
  });

  describe("Mesh Size", () => {
    it("should set and get mesh size", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      const size = MMG2D.getMeshSize(handle);
      expect(size.nVertices).toBe(4);
      expect(size.nTriangles).toBe(2);
      expect(size.nQuads).toBe(0);
      // Note: nEdges may be 0 until edges are actually set
      // This is MMG2D internal behavior
    });

    it("should report correct edge count after setting edges", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      // Set vertices
      const vertices = new Float64Array([
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      ]);
      MMG2D.setVertices(handle, vertices);

      // Set edges
      const edges = new Int32Array([1, 2, 2, 3, 3, 4, 4, 1]);
      MMG2D.setEdges(handle, edges);

      const size = MMG2D.getMeshSize(handle);
      expect(size.nEdges).toBe(4);
    });
  });

  describe("Vertices", () => {
    it("should set and get a single vertex", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);
      MMG2D.setVertex(handle, 1, 0.0, 0.0);
      MMG2D.setVertex(handle, 2, 1.0, 0.0);
      MMG2D.setVertex(handle, 3, 1.0, 1.0);
      MMG2D.setVertex(handle, 4, 0.0, 1.0);

      const vertices = MMG2D.getVertices(handle);
      expect(vertices.length).toBe(8); // 4 vertices * 2 coordinates

      // Check first vertex
      expect(vertices[0]).toBeCloseTo(0.0);
      expect(vertices[1]).toBeCloseTo(0.0);

      // Check second vertex
      expect(vertices[2]).toBeCloseTo(1.0);
      expect(vertices[3]).toBeCloseTo(0.0);
    });

    it("should set vertices in bulk", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      const vertices = new Float64Array([
        0.0,
        0.0, // vertex 1
        1.0,
        0.0, // vertex 2
        1.0,
        1.0, // vertex 3
        0.0,
        1.0, // vertex 4
      ]);

      MMG2D.setVertices(handle, vertices);

      const result = MMG2D.getVertices(handle);
      expect(result.length).toBe(8);

      // Verify all vertices
      for (let i = 0; i < vertices.length; i++) {
        expect(result[i]).toBeCloseTo(vertices[i]);
      }
    });

    it("should set vertices with references", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      const vertices = new Float64Array([
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      ]);
      const refs = new Int32Array([1, 2, 3, 4]);

      // Should not throw
      expect(() => MMG2D.setVertices(handle, vertices, refs)).not.toThrow();
    });

    it("should throw when vertices array length is not a multiple of 2", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      const badVertices = new Float64Array([0.0, 0.0, 1.0]); // length 3, not multiple of 2
      expect(() => MMG2D.setVertices(handle, badVertices)).toThrow(
        /must be a multiple of 2/,
      );
    });

    it("should throw when refs array length does not match vertex count", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      const vertices = new Float64Array([
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      ]);
      const badRefs = new Int32Array([1, 2]); // 2 refs for 4 vertices
      expect(() => MMG2D.setVertices(handle, vertices, badRefs)).toThrow(
        /must match number of vertices/,
      );
    });
  });

  describe("Triangles", () => {
    it("should set and get a single triangle", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      // Set vertices
      MMG2D.setVertex(handle, 1, 0.0, 0.0);
      MMG2D.setVertex(handle, 2, 1.0, 0.0);
      MMG2D.setVertex(handle, 3, 1.0, 1.0);
      MMG2D.setVertex(handle, 4, 0.0, 1.0);

      // Set triangles (1-indexed vertices)
      MMG2D.setTriangle(handle, 1, 1, 2, 3);
      MMG2D.setTriangle(handle, 2, 1, 3, 4);

      const tria = MMG2D.getTriangles(handle);
      expect(tria.length).toBe(6); // 2 triangles * 3 vertices

      // Check first triangle
      expect(tria[0]).toBe(1);
      expect(tria[1]).toBe(2);
      expect(tria[2]).toBe(3);
    });

    it("should set triangles in bulk", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      // Set vertices
      const vertices = new Float64Array([
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      ]);
      MMG2D.setVertices(handle, vertices);

      // Set triangles (1-indexed)
      const tria = new Int32Array([
        1,
        2,
        3, // T1
        1,
        3,
        4, // T2
      ]);
      MMG2D.setTriangles(handle, tria);

      const result = MMG2D.getTriangles(handle);
      expect(result.length).toBe(6);
      for (let i = 0; i < tria.length; i++) {
        expect(result[i]).toBe(tria[i]);
      }
    });

    it("should throw when triangles array length is not a multiple of 3", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      const badTria = new Int32Array([1, 2]); // length 2, not multiple of 3
      expect(() => MMG2D.setTriangles(handle, badTria)).toThrow(
        /must be a multiple of 3/,
      );
    });
  });

  describe("Edges", () => {
    it("should set and get a single edge", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      // Set vertices
      MMG2D.setVertex(handle, 1, 0.0, 0.0);
      MMG2D.setVertex(handle, 2, 1.0, 0.0);
      MMG2D.setVertex(handle, 3, 1.0, 1.0);
      MMG2D.setVertex(handle, 4, 0.0, 1.0);

      // Set edges (1-indexed vertices)
      MMG2D.setEdge(handle, 1, 1, 2);
      MMG2D.setEdge(handle, 2, 2, 3);
      MMG2D.setEdge(handle, 3, 3, 4);
      MMG2D.setEdge(handle, 4, 4, 1);

      const edges = MMG2D.getEdges(handle);
      expect(edges.length).toBe(8); // 4 edges * 2 vertices

      // Check first edge
      expect(edges[0]).toBe(1);
      expect(edges[1]).toBe(2);
    });

    it("should set edges in bulk", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      // Set vertices
      const vertices = new Float64Array([
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      ]);
      MMG2D.setVertices(handle, vertices);

      // Set edges (1-indexed)
      const edges = new Int32Array([
        1,
        2, // bottom
        2,
        3, // right
        3,
        4, // top
        4,
        1, // left
      ]);
      MMG2D.setEdges(handle, edges);

      const result = MMG2D.getEdges(handle);
      expect(result.length).toBe(8);
      for (let i = 0; i < edges.length; i++) {
        expect(result[i]).toBe(edges[i]);
      }
    });

    it("should throw when edges array length is not a multiple of 2", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      const badEdges = new Int32Array([1]); // length 1, not multiple of 2
      expect(() => MMG2D.setEdges(handle, badEdges)).toThrow(
        /must be a multiple of 2/,
      );
    });
  });

  describe("Parameters", () => {
    it("should set integer parameters", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      // Set verbosity to silent
      expect(() =>
        MMG2D.setIParam(handle, IPARAM_2D.verbose, -1),
      ).not.toThrow();
    });

    it("should set double parameters", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      // Set max edge length
      expect(() => MMG2D.setDParam(handle, DPARAM_2D.hmax, 0.5)).not.toThrow();
    });
  });

  describe("Remeshing", () => {
    it("should remesh a simple square mesh", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      // Create a simple square mesh with 2 triangles
      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      // Set vertices (unit square)
      const vertices = new Float64Array([
        0.0,
        0.0, // 1
        1.0,
        0.0, // 2
        1.0,
        1.0, // 3
        0.0,
        1.0, // 4
      ]);
      MMG2D.setVertices(handle, vertices);

      // Set triangles
      const tria = new Int32Array([
        1,
        2,
        3, // lower-right
        1,
        3,
        4, // upper-left
      ]);
      MMG2D.setTriangles(handle, tria);

      // Set boundary edges
      const edges = new Int32Array([
        1,
        2, // bottom
        2,
        3, // right
        3,
        4, // top
        4,
        1, // left
      ]);
      MMG2D.setEdges(handle, edges);

      // Set parameters for refinement
      MMG2D.setIParam(handle, IPARAM_2D.verbose, -1); // Silent
      MMG2D.setDParam(handle, DPARAM_2D.hmax, 0.3); // Small edge length to trigger refinement

      // Run remeshing
      const result = MMG2D.mmg2dlib(handle);

      // Check result (0 = success)
      expect(result).toBe(MMG_RETURN_CODES_2D.SUCCESS);

      // Verify mesh was refined (should have more vertices/triangles)
      const newSize = MMG2D.getMeshSize(handle);
      expect(newSize.nVertices).toBeGreaterThan(4);
      expect(newSize.nTriangles).toBeGreaterThan(2);

      // Verify we can retrieve the new mesh data
      const newVertices = MMG2D.getVertices(handle);
      expect(newVertices.length).toBe(newSize.nVertices * 2);

      const newTria = MMG2D.getTriangles(handle);
      expect(newTria.length).toBe(newSize.nTriangles * 3);
    });
  });

  describe("Multiple Handles", () => {
    it("should work with multiple independent meshes", () => {
      const handle1 = MMG2D.init();
      const handle2 = MMG2D.init();
      handles.push(handle1, handle2);

      expect(handle1).not.toBe(handle2);

      // Set different sizes for each mesh
      MMG2D.setMeshSize(handle1, 4, 2, 0, 4);
      MMG2D.setMeshSize(handle2, 6, 4, 0, 6);

      const size1 = MMG2D.getMeshSize(handle1);
      const size2 = MMG2D.getMeshSize(handle2);

      expect(size1.nVertices).toBe(4);
      expect(size2.nVertices).toBe(6);
    });
  });
});
