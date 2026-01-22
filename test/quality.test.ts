import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import {
  IPARAM,
  MMG3D,
  type MeshHandle,
  initMMG3D,
} from "../src/mmg3d";
import {
  IPARAM_2D,
  MMG2D,
  type MeshHandle2D,
  initMMG2D,
} from "../src/mmg2d";
import {
  IPARAM_S,
  MMGS,
  type MeshHandleS,
  initMMGS,
} from "../src/mmgs";
import {
  cubeVertices,
  cubeTetrahedra,
  cubeTriangles,
  nVertices as cubeNVertices,
  nTetrahedra,
  nTriangles as cubeNTriangles,
} from "./fixtures/cube";
import {
  squareVertices,
  squareTriangles,
  squareEdges,
  nVertices as squareNVertices,
  nTriangles as squareNTriangles,
  nEdges as squareNEdges,
} from "./fixtures/square";

describe("Quality Functions", () => {
  describe("MMG2D Quality", () => {
    const handles: MeshHandle2D[] = [];

    beforeAll(async () => {
      await initMMG2D();
    });

    afterEach(() => {
      for (const handle of handles) {
        try {
          MMG2D.free(handle);
        } catch {
          // Ignore errors from already-freed handles
        }
      }
      handles.length = 0;
    });

    it("should return quality values in range [0, 1]", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setIParam(handle, IPARAM_2D.verbose, -1);
      MMG2D.setMeshSize(handle, squareNVertices, squareNTriangles, 0, squareNEdges);
      MMG2D.setVertices(handle, squareVertices);
      MMG2D.setTriangles(handle, squareTriangles);
      MMG2D.setEdges(handle, squareEdges);

      const qualities = MMG2D.getTrianglesQualities(handle);

      expect(qualities.length).toBe(squareNTriangles);

      for (let i = 0; i < qualities.length; i++) {
        const q = qualities[i];
        expect(q).toBeGreaterThanOrEqual(0);
        expect(q).toBeLessThanOrEqual(1);
      }
    });

    it("should get individual triangle quality", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setIParam(handle, IPARAM_2D.verbose, -1);
      MMG2D.setMeshSize(handle, squareNVertices, squareNTriangles, 0, squareNEdges);
      MMG2D.setVertices(handle, squareVertices);
      MMG2D.setTriangles(handle, squareTriangles);
      MMG2D.setEdges(handle, squareEdges);

      // Test first triangle (1-indexed)
      const q1 = MMG2D.getTriangleQuality(handle, 1);
      expect(q1).toBeGreaterThanOrEqual(0);
      expect(q1).toBeLessThanOrEqual(1);

      // Test last triangle
      const qLast = MMG2D.getTriangleQuality(handle, squareNTriangles);
      expect(qLast).toBeGreaterThanOrEqual(0);
      expect(qLast).toBeLessThanOrEqual(1);

      // Individual quality should match bulk quality
      const qualities = MMG2D.getTrianglesQualities(handle);
      expect(q1).toBeCloseTo(qualities[0] ?? 0, 10);
      expect(qLast).toBeCloseTo(qualities[squareNTriangles - 1] ?? 0, 10);
    });

    it("should return empty array for mesh with no triangles", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setIParam(handle, IPARAM_2D.verbose, -1);
      MMG2D.setMeshSize(handle, 2, 0, 0, 1);

      const vertices = new Float64Array([0.0, 0.0, 1.0, 0.0]);
      const edges = new Int32Array([1, 2]);

      MMG2D.setVertices(handle, vertices);
      MMG2D.setEdges(handle, edges);

      const qualities = MMG2D.getTrianglesQualities(handle);
      expect(qualities.length).toBe(0);
    });
  });

  describe("MMGS Quality", () => {
    const handles: MeshHandleS[] = [];

    beforeAll(async () => {
      await initMMGS();
    });

    afterEach(() => {
      for (const handle of handles) {
        try {
          MMGS.free(handle);
        } catch {
          // Ignore errors from already-freed handles
        }
      }
      handles.length = 0;
    });

    it("should return quality values in range [0, 1]", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setIParam(handle, IPARAM_S.verbose, -1);
      MMGS.setMeshSize(handle, 4, 4, 6);

      // Simple tetrahedron surface mesh (4 triangular faces)
      const vertices = new Float64Array([
        0.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        0.5, 0.87, 0.0,
        0.5, 0.29, 0.82,
      ]);
      MMGS.setVertices(handle, vertices);

      const triangles = new Int32Array([
        1, 3, 2,
        1, 2, 4,
        2, 3, 4,
        3, 1, 4,
      ]);
      MMGS.setTriangles(handle, triangles);

      const edges = new Int32Array([1, 2, 2, 3, 3, 1, 1, 4, 2, 4, 3, 4]);
      MMGS.setEdges(handle, edges);

      const qualities = MMGS.getTrianglesQualities(handle);

      expect(qualities.length).toBe(4);

      for (let i = 0; i < qualities.length; i++) {
        const q = qualities[i];
        expect(q).toBeGreaterThanOrEqual(0);
        expect(q).toBeLessThanOrEqual(1);
      }
    });

    it("should get individual triangle quality", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setIParam(handle, IPARAM_S.verbose, -1);
      MMGS.setMeshSize(handle, 4, 4, 6);

      const vertices = new Float64Array([
        0.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        0.5, 0.87, 0.0,
        0.5, 0.29, 0.82,
      ]);
      MMGS.setVertices(handle, vertices);

      const triangles = new Int32Array([
        1, 3, 2,
        1, 2, 4,
        2, 3, 4,
        3, 1, 4,
      ]);
      MMGS.setTriangles(handle, triangles);

      const edges = new Int32Array([1, 2, 2, 3, 3, 1, 1, 4, 2, 4, 3, 4]);
      MMGS.setEdges(handle, edges);

      // Test first triangle (1-indexed)
      const q1 = MMGS.getTriangleQuality(handle, 1);
      expect(q1).toBeGreaterThanOrEqual(0);
      expect(q1).toBeLessThanOrEqual(1);

      // Test last triangle
      const qLast = MMGS.getTriangleQuality(handle, 4);
      expect(qLast).toBeGreaterThanOrEqual(0);
      expect(qLast).toBeLessThanOrEqual(1);

      // Individual quality should match bulk quality
      const qualities = MMGS.getTrianglesQualities(handle);
      expect(q1).toBeCloseTo(qualities[0] ?? 0, 10);
      expect(qLast).toBeCloseTo(qualities[3] ?? 0, 10);
    });
  });

  describe("MMG3D Quality", () => {
    const handles: MeshHandle[] = [];

    beforeAll(async () => {
      await initMMG3D();
    });

    afterEach(() => {
      for (const handle of handles) {
        try {
          MMG3D.free(handle);
        } catch {
          // Ignore errors from already-freed handles
        }
      }
      handles.length = 0;
    });

    it("should return quality values in range [0, 1]", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setIParam(handle, IPARAM.verbose, -1);
      MMG3D.setMeshSize(handle, cubeNVertices, nTetrahedra, 0, cubeNTriangles, 0, 0);
      MMG3D.setVertices(handle, cubeVertices);
      MMG3D.setTetrahedra(handle, cubeTetrahedra);
      MMG3D.setTriangles(handle, cubeTriangles);

      const qualities = MMG3D.getTetrahedraQualities(handle);

      expect(qualities.length).toBe(nTetrahedra);

      for (let i = 0; i < qualities.length; i++) {
        const q = qualities[i];
        expect(q).toBeGreaterThanOrEqual(0);
        expect(q).toBeLessThanOrEqual(1);
      }
    });

    it("should get individual tetrahedron quality", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setIParam(handle, IPARAM.verbose, -1);
      MMG3D.setMeshSize(handle, cubeNVertices, nTetrahedra, 0, cubeNTriangles, 0, 0);
      MMG3D.setVertices(handle, cubeVertices);
      MMG3D.setTetrahedra(handle, cubeTetrahedra);
      MMG3D.setTriangles(handle, cubeTriangles);

      // Test first tetrahedron (1-indexed)
      const q1 = MMG3D.getTetrahedronQuality(handle, 1);
      expect(q1).toBeGreaterThanOrEqual(0);
      expect(q1).toBeLessThanOrEqual(1);

      // Test last tetrahedron
      const qLast = MMG3D.getTetrahedronQuality(handle, nTetrahedra);
      expect(qLast).toBeGreaterThanOrEqual(0);
      expect(qLast).toBeLessThanOrEqual(1);

      // Individual quality should match bulk quality
      const qualities = MMG3D.getTetrahedraQualities(handle);
      expect(q1).toBeCloseTo(qualities[0] ?? 0, 10);
      expect(qLast).toBeCloseTo(qualities[nTetrahedra - 1] ?? 0, 10);
    });

    it("should return empty array for mesh with no tetrahedra", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setIParam(handle, IPARAM.verbose, -1);
      // Mesh with only surface triangles, no tetrahedra
      MMG3D.setMeshSize(handle, cubeNVertices, 0, 0, cubeNTriangles, 0, 0);
      MMG3D.setVertices(handle, cubeVertices);
      MMG3D.setTriangles(handle, cubeTriangles);

      const qualities = MMG3D.getTetrahedraQualities(handle);
      expect(qualities.length).toBe(0);
    });

    it("should have consistent quality after remeshing", () => {
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setIParam(handle, IPARAM.verbose, -1);
      MMG3D.setMeshSize(handle, cubeNVertices, nTetrahedra, 0, cubeNTriangles, 0, 0);
      MMG3D.setVertices(handle, cubeVertices);
      MMG3D.setTetrahedra(handle, cubeTetrahedra);
      MMG3D.setTriangles(handle, cubeTriangles);

      // Quality before remeshing
      const qualitiesBefore = MMG3D.getTetrahedraQualities(handle);
      expect(qualitiesBefore.length).toBe(nTetrahedra);

      // Run remeshing
      MMG3D.mmg3dlib(handle);

      // Quality after remeshing
      const qualitiesAfter = MMG3D.getTetrahedraQualities(handle);

      // After remeshing, we should still have valid qualities
      expect(qualitiesAfter.length).toBeGreaterThan(0);

      for (let i = 0; i < qualitiesAfter.length; i++) {
        const q = qualitiesAfter[i];
        expect(q).toBeGreaterThanOrEqual(0);
        expect(q).toBeLessThanOrEqual(1);
      }
    });
  });
});
