import type { QualityMetric, MeshData } from "@/types/mesh";

export function getMetricLabel(metric: QualityMetric): string {
  switch (metric) {
    case "mmgQuality":
      return "MMG Quality";
  }
}

export function getMetricRange(
  quality: Float32Array | Float64Array
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < quality.length; i++) {
    const v = quality[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  return { min, max };
}

/**
 * Compute the bounding box diagonal of a mesh (mesh scale).
 * This is useful for setting sensible default values for remeshing parameters.
 */
export function getMeshScale(mesh: MeshData, is2D: boolean): number {
  const vertices = mesh.vertices;
  const dim = is2D ? 2 : 3;
  const nVertices = vertices.length / dim;

  if (nVertices === 0) return 1;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < nVertices; i++) {
    const x = vertices[i * dim]!;
    const y = vertices[i * dim + 1]!;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    if (!is2D) {
      const z = vertices[i * dim + 2]!;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }

  const dx = maxX - minX;
  const dy = maxY - minY;
  const dz = is2D ? 0 : maxZ - minZ;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
