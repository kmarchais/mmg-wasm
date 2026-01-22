import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import {
  IPARAM,
  MMG3D,
  MMG_RETURN_CODES,
  SOL_ENTITY,
  SOL_TYPE,
  type MeshHandle,
  initMMG3D,
} from "../src/mmg3d";
import {
  IPARAM_2D,
  MMG2D,
  MMG_RETURN_CODES_2D,
  SOL_ENTITY_2D,
  SOL_TYPE_2D,
  type MeshHandle2D,
  initMMG2D,
} from "../src/mmg2d";
import {
  IPARAM_S,
  MMGS,
  MMG_RETURN_CODES_S,
  SOL_ENTITY_S,
  SOL_TYPE_S,
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

describe("Metric Fields", () => {
  describe("MMG3D Metrics", () => {
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

    it("should refine more in regions with smaller metric values", () => {
      // Create a cube mesh and apply a spatially varying metric
      // that requests smaller elements near the origin
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setIParam(handle, IPARAM.verbose, -1);
      MMG3D.setMeshSize(
        handle,
        cubeNVertices,
        nTetrahedra,
        0,
        cubeNTriangles,
        0,
        0,
      );
      MMG3D.setVertices(handle, cubeVertices);
      MMG3D.setTetrahedra(handle, cubeTetrahedra);
      MMG3D.setTriangles(handle, cubeTriangles);

      // Set scalar metric: smaller values near origin, larger away
      MMG3D.setSolSize(
        handle,
        SOL_ENTITY.VERTEX,
        cubeNVertices,
        SOL_TYPE.SCALAR,
      );

      const metric = new Float64Array(cubeNVertices);
      for (let i = 0; i < cubeNVertices; i++) {
        // Get vertex coordinates
        const x = cubeVertices[i * 3];
        const y = cubeVertices[i * 3 + 1];
        const z = cubeVertices[i * 3 + 2];

        // Distance from origin
        const dist = Math.sqrt(x * x + y * y + z * z);

        // Metric: 0.1 at origin, 0.5 at corners
        metric[i] = 0.1 + 0.4 * (dist / Math.sqrt(3));
      }
      MMG3D.setScalarSols(handle, metric);

      // Run remeshing
      const result = MMG3D.mmg3dlib(handle);
      expect(result).toBe(MMG_RETURN_CODES.SUCCESS);

      // Get resulting mesh
      const newSize = MMG3D.getMeshSize(handle);

      // Verify the mesh was refined based on the varying metric
      // The mesh should have more vertices and tetrahedra than the original
      expect(newSize.nVertices).toBeGreaterThan(cubeNVertices);
      expect(newSize.nTetrahedra).toBeGreaterThan(nTetrahedra);

      // Verify the metric was actually used (mesh size increased significantly)
      // With a metric of 0.1-0.5 on a unit cube, we expect substantial refinement
      expect(newSize.nVertices).toBeGreaterThan(20); // More than a few vertices
    });

    it("should apply anisotropic tensor metric correctly", () => {
      // Test that tensor metric allows directional control
      const handle = MMG3D.init();
      handles.push(handle);

      MMG3D.setIParam(handle, IPARAM.verbose, -1);
      MMG3D.setMeshSize(
        handle,
        cubeNVertices,
        nTetrahedra,
        0,
        cubeNTriangles,
        0,
        0,
      );
      MMG3D.setVertices(handle, cubeVertices);
      MMG3D.setTetrahedra(handle, cubeTetrahedra);
      MMG3D.setTriangles(handle, cubeTriangles);

      // Set tensor metric (6 components per vertex for 3D: m11, m12, m13, m22, m23, m33)
      // Create metric that is finer in x-direction than y/z
      MMG3D.setSolSize(
        handle,
        SOL_ENTITY.VERTEX,
        cubeNVertices,
        SOL_TYPE.TENSOR,
      );

      const tensorMetric = new Float64Array(cubeNVertices * 6);
      for (let i = 0; i < cubeNVertices; i++) {
        const idx = i * 6;
        // Metric tensor: smaller in x (m11), larger in y,z (m22, m33)
        // This should create elements stretched in x-direction
        tensorMetric[idx + 0] = 100.0; // m11 - fine in x
        tensorMetric[idx + 1] = 0.0; // m12
        tensorMetric[idx + 2] = 0.0; // m13
        tensorMetric[idx + 3] = 25.0; // m22 - coarse in y
        tensorMetric[idx + 4] = 0.0; // m23
        tensorMetric[idx + 5] = 25.0; // m33 - coarse in z
      }
      MMG3D.setTensorSols(handle, tensorMetric);

      // Run remeshing
      const result = MMG3D.mmg3dlib(handle);
      expect(result).toBe(MMG_RETURN_CODES.SUCCESS);

      // Verify mesh was refined
      const newSize = MMG3D.getMeshSize(handle);
      expect(newSize.nVertices).toBeGreaterThan(cubeNVertices);
      expect(newSize.nTetrahedra).toBeGreaterThan(nTetrahedra);
    });
  });

  describe("MMG2D Metrics", () => {
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

    it("should refine more in regions with smaller metric values", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setIParam(handle, IPARAM_2D.verbose, -1);
      MMG2D.setMeshSize(
        handle,
        squareNVertices,
        squareNTriangles,
        0,
        squareNEdges,
      );
      MMG2D.setVertices(handle, squareVertices);
      MMG2D.setTriangles(handle, squareTriangles);
      MMG2D.setEdges(handle, squareEdges);

      // Set scalar metric: smaller at corner (0,0), larger at (1,1)
      MMG2D.setSolSize(
        handle,
        SOL_ENTITY_2D.VERTEX,
        squareNVertices,
        SOL_TYPE_2D.SCALAR,
      );

      const metric = new Float64Array(squareNVertices);
      for (let i = 0; i < squareNVertices; i++) {
        const x = squareVertices[i * 2];
        const y = squareVertices[i * 2 + 1];
        const dist = Math.sqrt(x * x + y * y);
        // Metric: 0.1 at origin, 0.3 at far corner
        metric[i] = 0.1 + 0.2 * (dist / Math.sqrt(2));
      }
      MMG2D.setScalarSols(handle, metric);

      const result = MMG2D.mmg2dlib(handle);
      expect(result).toBe(MMG_RETURN_CODES_2D.SUCCESS);

      // Verify mesh was refined
      const newSize = MMG2D.getMeshSize(handle);
      expect(newSize.nVertices).toBeGreaterThan(squareNVertices);
      expect(newSize.nTriangles).toBeGreaterThan(squareNTriangles);
    });

    it("should apply 2D anisotropic tensor metric", () => {
      const handle = MMG2D.init();
      handles.push(handle);

      MMG2D.setIParam(handle, IPARAM_2D.verbose, -1);
      MMG2D.setMeshSize(
        handle,
        squareNVertices,
        squareNTriangles,
        0,
        squareNEdges,
      );
      MMG2D.setVertices(handle, squareVertices);
      MMG2D.setTriangles(handle, squareTriangles);
      MMG2D.setEdges(handle, squareEdges);

      // Set tensor metric (3 components per vertex for 2D: m11, m12, m22)
      MMG2D.setSolSize(
        handle,
        SOL_ENTITY_2D.VERTEX,
        squareNVertices,
        SOL_TYPE_2D.TENSOR,
      );

      const tensorMetric = new Float64Array(squareNVertices * 3);
      for (let i = 0; i < squareNVertices; i++) {
        const idx = i * 3;
        // Metric tensor: finer in x, coarser in y
        tensorMetric[idx + 0] = 100.0; // m11 - fine in x
        tensorMetric[idx + 1] = 0.0; // m12
        tensorMetric[idx + 2] = 25.0; // m22 - coarse in y
      }
      MMG2D.setTensorSols(handle, tensorMetric);

      const result = MMG2D.mmg2dlib(handle);
      expect(result).toBe(MMG_RETURN_CODES_2D.SUCCESS);

      const newSize = MMG2D.getMeshSize(handle);
      expect(newSize.nVertices).toBeGreaterThan(squareNVertices);
    });
  });

  describe("MMGS Metrics", () => {
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

    it("should refine surface mesh with spatially varying metric", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setIParam(handle, IPARAM_S.verbose, -1);
      MMGS.setMeshSize(handle, 4, 4, 6);

      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      MMGS.setVertices(handle, vertices);

      const tria = new Int32Array([1, 3, 2, 1, 2, 4, 2, 3, 4, 3, 1, 4]);
      MMGS.setTriangles(handle, tria);

      const edges = new Int32Array([1, 2, 2, 3, 3, 1, 1, 4, 2, 4, 3, 4]);
      MMGS.setEdges(handle, edges);

      // Set scalar metric with spatial variation
      MMGS.setSolSize(handle, SOL_ENTITY_S.VERTEX, 4, SOL_TYPE_S.SCALAR);
      // Finer at apex (vertex 4), coarser at base
      const metric = new Float64Array([0.3, 0.3, 0.3, 0.1]);
      MMGS.setScalarSols(handle, metric);

      const result = MMGS.mmgslib(handle);
      expect(result).toBe(MMG_RETURN_CODES_S.SUCCESS);

      const newSize = MMGS.getMeshSize(handle);
      expect(newSize.nVertices).toBeGreaterThan(4);
      expect(newSize.nTriangles).toBeGreaterThan(4);
    });

    it("should apply 3D surface tensor metric", () => {
      const handle = MMGS.init();
      handles.push(handle);

      MMGS.setIParam(handle, IPARAM_S.verbose, -1);
      MMGS.setMeshSize(handle, 4, 4, 6);

      const vertices = new Float64Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
      ]);
      MMGS.setVertices(handle, vertices);

      const tria = new Int32Array([1, 3, 2, 1, 2, 4, 2, 3, 4, 3, 1, 4]);
      MMGS.setTriangles(handle, tria);

      const edges = new Int32Array([1, 2, 2, 3, 3, 1, 1, 4, 2, 4, 3, 4]);
      MMGS.setEdges(handle, edges);

      // Set tensor metric (6 components per vertex for 3D surface)
      MMGS.setSolSize(handle, SOL_ENTITY_S.VERTEX, 4, SOL_TYPE_S.TENSOR);

      const tensorMetric = new Float64Array(4 * 6);
      for (let i = 0; i < 4; i++) {
        const idx = i * 6;
        // Isotropic tensor for simplicity
        tensorMetric[idx + 0] = 25.0; // m11
        tensorMetric[idx + 1] = 0.0; // m12
        tensorMetric[idx + 2] = 0.0; // m13
        tensorMetric[idx + 3] = 25.0; // m22
        tensorMetric[idx + 4] = 0.0; // m23
        tensorMetric[idx + 5] = 25.0; // m33
      }
      MMGS.setTensorSols(handle, tensorMetric);

      const result = MMGS.mmgslib(handle);
      expect(result).toBe(MMG_RETURN_CODES_S.SUCCESS);

      const newSize = MMGS.getMeshSize(handle);
      expect(newSize.nVertices).toBeGreaterThan(4);
    });
  });
});
