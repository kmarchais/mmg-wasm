import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import {
  DPARAM,
  IPARAM,
  MMG3D,
  MMG_RETURN_CODES,
  type MeshHandle,
  initMMG3D,
} from "../src/mmg3d";
import {
  cubeTetrahedra,
  cubeTriangles,
  cubeVertices,
  nTetrahedra,
  nTriangles,
  nVertices,
} from "./fixtures/cube";

/**
 * Compute the signed volume of a tetrahedron.
 * V = det([p1-p0, p2-p0, p3-p0]) / 6
 *
 * @param p0 First vertex [x, y, z]
 * @param p1 Second vertex [x, y, z]
 * @param p2 Third vertex [x, y, z]
 * @param p3 Fourth vertex [x, y, z]
 * @returns Signed volume (positive = correct orientation)
 */
function computeTetVolume(
  p0: [number, number, number],
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number],
): number {
  // Edge vectors from p0
  const a = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const b = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
  const c = [p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]];

  // Determinant (triple scalar product)
  const det =
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0]);

  return det / 6;
}

/**
 * Set up a cube mesh on the given handle
 */
function setupCubeMesh(handle: MeshHandle): void {
  MMG3D.setMeshSize(handle, nVertices, nTetrahedra, 0, nTriangles, 0, 0);
  MMG3D.setVertices(handle, cubeVertices);
  MMG3D.setTetrahedra(handle, cubeTetrahedra);
  MMG3D.setTriangles(handle, cubeTriangles);
  MMG3D.setIParam(handle, IPARAM.verbose, -1); // Silent
}

describe("Cube Remeshing", () => {
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

  it("remeshes cube with default parameters", () => {
    const handle = MMG3D.init();
    handles.push(handle);

    setupCubeMesh(handle);

    // Run remeshing
    const result = MMG3D.mmg3dlib(handle);
    expect(result).toBe(MMG_RETURN_CODES.SUCCESS);

    // Verify mesh was processed
    const size = MMG3D.getMeshSize(handle);
    expect(size.nVertices).toBeGreaterThan(0);
    expect(size.nTetrahedra).toBeGreaterThan(0);

    // Verify we can retrieve mesh data
    const vertices = MMG3D.getVertices(handle);
    expect(vertices.length).toBe(size.nVertices * 3);

    const tetra = MMG3D.getTetrahedra(handle);
    expect(tetra.length).toBe(size.nTetrahedra * 4);
  });

  it("remeshes with hmax parameter (finer mesh)", () => {
    const handleCoarse = MMG3D.init();
    const handleFine = MMG3D.init();
    handles.push(handleCoarse, handleFine);

    // Coarse mesh with large hmax
    setupCubeMesh(handleCoarse);
    MMG3D.setDParam(handleCoarse, DPARAM.hmax, 0.8);

    // Fine mesh with small hmax
    setupCubeMesh(handleFine);
    MMG3D.setDParam(handleFine, DPARAM.hmax, 0.2);

    // Remesh both
    expect(MMG3D.mmg3dlib(handleCoarse)).toBe(MMG_RETURN_CODES.SUCCESS);
    expect(MMG3D.mmg3dlib(handleFine)).toBe(MMG_RETURN_CODES.SUCCESS);

    const sizeCoarse = MMG3D.getMeshSize(handleCoarse);
    const sizeFine = MMG3D.getMeshSize(handleFine);

    // Fine mesh should have more elements than coarse mesh
    expect(sizeFine.nVertices).toBeGreaterThan(sizeCoarse.nVertices);
    expect(sizeFine.nTetrahedra).toBeGreaterThan(sizeCoarse.nTetrahedra);
  });
});

describe("Output Mesh Validation", () => {
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

  it("vertices are within bounds", () => {
    const handle = MMG3D.init();
    handles.push(handle);

    setupCubeMesh(handle);
    MMG3D.setDParam(handle, DPARAM.hmax, 0.3);

    expect(MMG3D.mmg3dlib(handle)).toBe(MMG_RETURN_CODES.SUCCESS);

    const vertices = MMG3D.getVertices(handle);
    const size = MMG3D.getMeshSize(handle);

    // Small tolerance for numerical precision
    const tolerance = 1e-10;

    for (let i = 0; i < size.nVertices; i++) {
      const x = vertices[i * 3];
      const y = vertices[i * 3 + 1];
      const z = vertices[i * 3 + 2];

      expect(x).toBeGreaterThanOrEqual(-tolerance);
      expect(x).toBeLessThanOrEqual(1 + tolerance);
      expect(y).toBeGreaterThanOrEqual(-tolerance);
      expect(y).toBeLessThanOrEqual(1 + tolerance);
      expect(z).toBeGreaterThanOrEqual(-tolerance);
      expect(z).toBeLessThanOrEqual(1 + tolerance);
    }
  });

  it("tetrahedra have valid indices", () => {
    const handle = MMG3D.init();
    handles.push(handle);

    setupCubeMesh(handle);
    MMG3D.setDParam(handle, DPARAM.hmax, 0.3);

    expect(MMG3D.mmg3dlib(handle)).toBe(MMG_RETURN_CODES.SUCCESS);

    const size = MMG3D.getMeshSize(handle);
    const tetra = MMG3D.getTetrahedra(handle);

    for (let i = 0; i < size.nTetrahedra; i++) {
      const v0 = tetra[i * 4];
      const v1 = tetra[i * 4 + 1];
      const v2 = tetra[i * 4 + 2];
      const v3 = tetra[i * 4 + 3];

      // All indices should be in range [1, nVertices] (1-indexed)
      expect(v0).toBeGreaterThanOrEqual(1);
      expect(v0).toBeLessThanOrEqual(size.nVertices);
      expect(v1).toBeGreaterThanOrEqual(1);
      expect(v1).toBeLessThanOrEqual(size.nVertices);
      expect(v2).toBeGreaterThanOrEqual(1);
      expect(v2).toBeLessThanOrEqual(size.nVertices);
      expect(v3).toBeGreaterThanOrEqual(1);
      expect(v3).toBeLessThanOrEqual(size.nVertices);
    }
  });

  it("tetrahedra have positive volume", () => {
    const handle = MMG3D.init();
    handles.push(handle);

    setupCubeMesh(handle);
    MMG3D.setDParam(handle, DPARAM.hmax, 0.3);

    expect(MMG3D.mmg3dlib(handle)).toBe(MMG_RETURN_CODES.SUCCESS);

    const size = MMG3D.getMeshSize(handle);
    const vertices = MMG3D.getVertices(handle);
    const tetra = MMG3D.getTetrahedra(handle);

    // Helper to get vertex coordinates by 1-indexed vertex number
    const getVertex = (idx: number): [number, number, number] => {
      const i = idx - 1; // Convert to 0-indexed
      return [vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]];
    };

    for (let i = 0; i < size.nTetrahedra; i++) {
      const v0 = tetra[i * 4];
      const v1 = tetra[i * 4 + 1];
      const v2 = tetra[i * 4 + 2];
      const v3 = tetra[i * 4 + 3];

      const p0 = getVertex(v0);
      const p1 = getVertex(v1);
      const p2 = getVertex(v2);
      const p3 = getVertex(v3);

      const volume = computeTetVolume(p0, p1, p2, p3);

      // Volume should be positive (correct orientation, no inverted elements)
      expect(volume).toBeGreaterThan(0);
    }
  });
});
