/**
 * Unit square mesh fixture for 2D integration testing
 *
 * Square vertices in [0,1]² with 2-triangle decomposition (diagonal split)
 * All indices are 1-based (MMG convention)
 *
 * Vertex layout:
 *  4-------3
 *  |     / |
 *  |   /   |
 *  | /     |
 *  1-------2
 */

/**
 * 4 vertices of the unit square [0,1]²
 * Format: [x0, y0, x1, y1, ...]
 */
export const squareVertices = new Float64Array([
  0.0,
  0.0, // 1: origin
  1.0,
  0.0, // 2: +x
  1.0,
  1.0, // 3: +x+y
  0.0,
  1.0, // 4: +y
]);

/**
 * 2 triangles decomposition using diagonal from vertex 1 to 3
 * Format: [v0, v1, v2, ...] (1-indexed)
 */
export const squareTriangles = new Int32Array([
  1,
  2,
  3, // T1: lower-right triangle
  1,
  3,
  4, // T2: upper-left triangle
]);

/**
 * 4 boundary edges of the square
 * Format: [v0, v1, ...] (1-indexed)
 */
export const squareEdges = new Int32Array([
  1,
  2, // bottom edge
  2,
  3, // right edge
  3,
  4, // top edge
  4,
  1, // left edge
]);

/** Number of vertices in the square mesh */
export const nVertices = 4;

/** Number of triangles in the square mesh */
export const nTriangles = 2;

/** Number of boundary edges in the square mesh */
export const nEdges = 4;
