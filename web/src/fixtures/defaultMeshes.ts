/**
 * Default test meshes for initializing the application.
 */

import type { MeshData, MeshStats } from "@/types/mesh";

// 2D square mesh for MMG2D
export const squareMesh: MeshData = {
  vertices: new Float64Array([0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0]),
  triangles: new Int32Array([1, 2, 3, 1, 3, 4]),
  edges: new Int32Array([1, 2, 2, 3, 3, 4, 4, 1]),
};

export const squareStats: MeshStats = {
  nVertices: 4,
  nTriangles: 2,
  nEdges: 4,
  nTetrahedra: 0,
};

// 3D tetrahedron surface mesh for MMGS
export const tetraMesh: MeshData = {
  vertices: new Float64Array([
    0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 0.87, 0.0, 0.5, 0.29, 0.82,
  ]),
  triangles: new Int32Array([1, 3, 2, 1, 2, 4, 2, 3, 4, 3, 1, 4]),
  edges: new Int32Array([1, 2, 2, 3, 3, 1, 1, 4, 2, 4, 3, 4]),
};

export const tetraStats: MeshStats = {
  nVertices: 4,
  nTriangles: 4,
  nEdges: 6,
  nTetrahedra: 0,
};

// 3D cube mesh for MMG3D
export const cubeMesh: MeshData = {
  vertices: new Float64Array([
    0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0,
  ]),
  tetrahedra: new Int32Array([
    1, 2, 3, 7, 1, 3, 4, 7, 1, 4, 8, 7, 1, 8, 5, 7, 1, 5, 6, 7, 1, 6, 2, 7,
  ]),
  triangles: new Int32Array([
    1, 3, 2, 1, 4, 3, 5, 6, 7, 5, 7, 8, 1, 2, 6, 1, 6, 5, 3, 8, 4, 3, 7, 8, 1,
    5, 8, 1, 8, 4, 2, 3, 7, 2, 7, 6,
  ]),
};

export const cubeStats: MeshStats = {
  nVertices: 8,
  nTriangles: 12,
  nEdges: 0,
  nTetrahedra: 6,
};
