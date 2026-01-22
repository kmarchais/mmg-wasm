/**
 * RemeshResult - Result of mesh remeshing operation
 *
 * Contains the remeshed mesh along with statistics and quality metrics.
 */

import type { Mesh } from "./mesh";

/**
 * Result of a mesh remeshing operation
 *
 * @example
 * ```typescript
 * const result = await mesh.remesh({ hmax: 0.1 });
 *
 * // Access the remeshed mesh
 * console.log(result.mesh.nVertices);
 *
 * // Check quality improvement
 * console.log(`Quality improved by ${result.qualityImprovement.toFixed(2)}x`);
 *
 * // Check timing
 * console.log(`Remeshing took ${result.elapsed.toFixed(0)}ms`);
 * ```
 */
export interface RemeshResult {
  /** Remeshed mesh (new instance, original unchanged) */
  mesh: Mesh;

  /** Number of vertices in result */
  nVertices: number;

  /** Number of cells in result (triangles for 2D/surface, tetrahedra for 3D) */
  nCells: number;

  /** Number of boundary faces in result (edges for 2D/surface, triangles for 3D) */
  nBoundaryFaces: number;

  /** Elapsed time in milliseconds */
  elapsed: number;

  /**
   * Minimum element quality before remeshing (0-1, higher is better)
   *
   * Quality is computed using MMG's internal metric which measures
   * element shape regularity. A value of 1 represents a perfect
   * element (equilateral triangle or regular tetrahedron).
   */
  qualityBefore: number;

  /**
   * Minimum element quality after remeshing (0-1, higher is better)
   *
   * Quality is computed using MMG's internal metric which measures
   * element shape regularity. A value of 1 represents a perfect
   * element (equilateral triangle or regular tetrahedron).
   */
  qualityAfter: number;

  /**
   * Quality improvement ratio (qualityAfter / qualityBefore)
   *
   * Values greater than 1 indicate improvement.
   * Can be Infinity if qualityBefore was 0.
   */
  qualityImprovement: number;

  /**
   * Number of vertices inserted during remeshing
   *
   * Note: MMG does not expose detailed operation counts,
   * so this is estimated from the vertex count difference.
   */
  nInserted: number;

  /**
   * Number of vertices deleted during remeshing
   *
   * Note: MMG does not expose detailed operation counts,
   * so this is estimated from the vertex count difference.
   */
  nDeleted: number;

  /**
   * Number of edges/faces swapped during remeshing
   *
   * Note: MMG does not expose this statistic, always 0.
   */
  nSwapped: number;

  /**
   * Number of vertices relocated during remeshing
   *
   * Note: MMG does not expose this statistic, always 0.
   */
  nMoved: number;

  /** Whether remeshing succeeded */
  success: boolean;

  /** Warning messages from MMG (if any) */
  warnings: string[];
}
