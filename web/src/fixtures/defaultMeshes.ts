/**
 * Default test meshes for initializing the application.
 */

import type { MeshData, MeshStats } from "@/types/mesh";

export interface SampleMesh {
  name: string;
  description: string;
  mesh: MeshData;
  stats: MeshStats;
}

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

// 2D L-shape mesh
function createLShapeMesh(): { mesh: MeshData; stats: MeshStats } {
  const vertices = new Float64Array([
    0.0, 0.0, 1.0, 0.0, 1.0, 0.5, 0.5, 0.5, 0.5, 1.0, 0.0, 1.0,
  ]);
  const triangles = new Int32Array([1, 2, 3, 1, 3, 4, 1, 4, 6, 4, 5, 6]);
  const edges = new Int32Array([1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 1]);
  return {
    mesh: { vertices, triangles, edges },
    stats: { nVertices: 6, nTriangles: 4, nEdges: 6, nTetrahedra: 0 },
  };
}

// 2D circle approximation (hexagon)
function createCircleMesh(): { mesh: MeshData; stats: MeshStats } {
  const n = 6;
  const vertices: number[] = [0, 0]; // center
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    vertices.push(Math.cos(angle), Math.sin(angle));
  }
  const triangles: number[] = [];
  for (let i = 0; i < n; i++) {
    triangles.push(1, i + 2, ((i + 1) % n) + 2);
  }
  const edges: number[] = [];
  for (let i = 0; i < n; i++) {
    edges.push(i + 2, ((i + 1) % n) + 2);
  }
  return {
    mesh: {
      vertices: new Float64Array(vertices),
      triangles: new Int32Array(triangles),
      edges: new Int32Array(edges),
    },
    stats: { nVertices: n + 1, nTriangles: n, nEdges: n, nTetrahedra: 0 },
  };
}

const lShape = createLShapeMesh();
const circle = createCircleMesh();

export const samples2D: SampleMesh[] = [
  {
    name: "Square",
    description: "Unit square",
    mesh: squareMesh,
    stats: squareStats,
  },
  {
    name: "L-Shape",
    description: "L-shaped domain",
    mesh: lShape.mesh,
    stats: lShape.stats,
  },
  {
    name: "Circle",
    description: "Hexagonal approximation",
    mesh: circle.mesh,
    stats: circle.stats,
  },
];

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

// Octahedron surface mesh
function createOctahedronSurface(): { mesh: MeshData; stats: MeshStats } {
  const vertices = new Float64Array([
    1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1,
  ]);
  const triangles = new Int32Array([
    1, 3, 5, 3, 2, 5, 2, 4, 5, 4, 1, 5, 3, 1, 6, 2, 3, 6, 4, 2, 6, 1, 4, 6,
  ]);
  const edges = new Int32Array([
    1, 3, 3, 2, 2, 4, 4, 1, 1, 5, 2, 5, 3, 5, 4, 5, 1, 6, 2, 6, 3, 6, 4, 6,
  ]);
  return {
    mesh: { vertices, triangles, edges },
    stats: { nVertices: 6, nTriangles: 8, nEdges: 12, nTetrahedra: 0 },
  };
}

// Cube surface (for MMGS)
function createCubeSurface(): { mesh: MeshData; stats: MeshStats } {
  const vertices = new Float64Array([
    0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
  ]);
  const triangles = new Int32Array([
    1, 3, 2, 1, 4, 3, 5, 6, 7, 5, 7, 8, 1, 2, 6, 1, 6, 5, 3, 8, 4, 3, 7, 8, 1,
    5, 8, 1, 8, 4, 2, 3, 7, 2, 7, 6,
  ]);
  const edges = new Int32Array([
    1, 2, 2, 3, 3, 4, 4, 1, 5, 6, 6, 7, 7, 8, 8, 5, 1, 5, 2, 6, 3, 7, 4, 8,
  ]);
  return {
    mesh: { vertices, triangles, edges },
    stats: { nVertices: 8, nTriangles: 12, nEdges: 12, nTetrahedra: 0 },
  };
}

const octahedron = createOctahedronSurface();
const cubeSurface = createCubeSurface();

export const samplesSurface: SampleMesh[] = [
  {
    name: "Tetrahedron",
    description: "4-vertex pyramid",
    mesh: tetraMesh,
    stats: tetraStats,
  },
  {
    name: "Octahedron",
    description: "8-face polyhedron",
    mesh: octahedron.mesh,
    stats: octahedron.stats,
  },
  {
    name: "Cube",
    description: "Box surface",
    mesh: cubeSurface.mesh,
    stats: cubeSurface.stats,
  },
];

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

// Single tetrahedron for MMG3D
function createSingleTetrahedron(): { mesh: MeshData; stats: MeshStats } {
  const vertices = new Float64Array([
    0, 0, 0, 1, 0, 0, 0.5, 0.87, 0, 0.5, 0.29, 0.82,
  ]);
  const tetrahedra = new Int32Array([1, 2, 3, 4]);
  const triangles = new Int32Array([1, 3, 2, 1, 2, 4, 2, 3, 4, 3, 1, 4]);
  return {
    mesh: { vertices, tetrahedra, triangles },
    stats: { nVertices: 4, nTriangles: 4, nEdges: 0, nTetrahedra: 1 },
  };
}

// L-shaped 3D domain
function createLShape3D(): { mesh: MeshData; stats: MeshStats } {
  // L-shape extruded in z
  const vertices = new Float64Array([
    // Bottom layer (z=0)
    0, 0, 0, 1, 0, 0, 1, 0.5, 0, 0.5, 0.5, 0, 0.5, 1, 0, 0, 1, 0,
    // Top layer (z=0.5)
    0, 0, 0.5, 1, 0, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 0, 1, 0.5,
  ]);
  // Simple tet mesh of the L-shape
  const tetrahedra = new Int32Array([
    // Bottom part
    1, 2, 3, 8, 1, 3, 4, 8, 1, 4, 7, 8, 3, 8, 9, 10, 1, 4, 10, 7, 4, 10, 7, 11,
    // Top part
    1, 4, 5, 7, 4, 5, 11, 7, 5, 11, 12, 7, 1, 5, 6, 7, 5, 6, 12, 7,
  ]);
  const triangles = new Int32Array([
    // Boundary faces (simplified)
    1, 2, 8, 2, 3, 8, 3, 9, 8, 3, 4, 10, 4, 5, 11, 5, 6, 12,
  ]);
  return {
    mesh: { vertices, tetrahedra, triangles },
    stats: { nVertices: 12, nTriangles: 6, nEdges: 0, nTetrahedra: 10 },
  };
}

const singleTet = createSingleTetrahedron();
const lShape3D = createLShape3D();

export const samples3D: SampleMesh[] = [
  { name: "Cube", description: "Unit cube", mesh: cubeMesh, stats: cubeStats },
  {
    name: "Tetrahedron",
    description: "Single tetrahedron",
    mesh: singleTet.mesh,
    stats: singleTet.stats,
  },
  {
    name: "L-Shape",
    description: "L-shaped domain",
    mesh: lShape3D.mesh,
    stats: lShape3D.stats,
  },
];
