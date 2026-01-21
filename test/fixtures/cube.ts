/**
 * Unit cube mesh fixture for integration testing
 *
 * Cube vertices in [0,1]³ with 6-tetrahedra decomposition
 * All indices are 1-based (MMG convention)
 *
 * Vertex layout:
 *     8-------7
 *    /|      /|
 *   / |     / |
 *  5-------6  |
 *  |  4----|--3
 *  | /     | /
 *  |/      |/
 *  1-------2
 */

/**
 * 8 vertices of the unit cube [0,1]³
 * Format: [x0, y0, z0, x1, y1, z1, ...]
 */
export const cubeVertices = new Float64Array([
  0.0,
  0.0,
  0.0, // 1: origin
  1.0,
  0.0,
  0.0, // 2: +x
  1.0,
  1.0,
  0.0, // 3: +x+y
  0.0,
  1.0,
  0.0, // 4: +y
  0.0,
  0.0,
  1.0, // 5: +z
  1.0,
  0.0,
  1.0, // 6: +x+z
  1.0,
  1.0,
  1.0, // 7: +x+y+z
  0.0,
  1.0,
  1.0, // 8: +y+z
]);

/**
 * 6 tetrahedra decomposition using the space diagonal 1-7
 * Each tetrahedron shares vertices 1 and 7
 * Format: [v0, v1, v2, v3, ...] (1-indexed)
 */
export const cubeTetrahedra = new Int32Array([
  1,
  2,
  3,
  7, // T1: bottom-right face
  1,
  3,
  4,
  7, // T2: bottom-back face
  1,
  4,
  8,
  7, // T3: back-left face
  1,
  8,
  5,
  7, // T4: top-left face
  1,
  5,
  6,
  7, // T5: top-front face
  1,
  6,
  2,
  7, // T6: front-right face
]);

/**
 * 12 boundary triangles (2 per face), oriented with outward normals
 * Format: [v0, v1, v2, ...] (1-indexed)
 */
export const cubeTriangles = new Int32Array([
  // Bottom face (z=0), outward normal -z
  1, 3, 2, 1, 4, 3,
  // Top face (z=1), outward normal +z
  5, 6, 7, 5, 7, 8,
  // Front face (y=0), outward normal -y
  1, 2, 6, 1, 6, 5,
  // Back face (y=1), outward normal +y
  3, 8, 4, 3, 7, 8,
  // Left face (x=0), outward normal -x
  1, 5, 8, 1, 8, 4,
  // Right face (x=1), outward normal +x
  2, 3, 7, 2, 7, 6,
]);

/** Number of vertices in the cube mesh */
export const nVertices = 8;

/** Number of tetrahedra in the cube mesh */
export const nTetrahedra = 6;

/** Number of boundary triangles in the cube mesh */
export const nTriangles = 12;
