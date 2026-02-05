import type { BrushSettings } from "@/stores/paintStore";
import type { MeshData } from "@/types/mesh";
import * as THREE from "three";

/**
 * Initialize a size field for a mesh with a default size
 */
export function initializeSizeField(
  mesh: MeshData,
  is2D: boolean,
  defaultSize: number,
): Float64Array {
  const dim = is2D ? 2 : 3;
  const nVertices = mesh.vertices.length / dim;
  const sizeField = new Float64Array(nVertices);
  sizeField.fill(defaultSize);
  return sizeField;
}

/**
 * Compute the bounding box diagonal of a mesh (for scale-relative calculations)
 */
export function computeMeshDiagonal(mesh: MeshData, is2D: boolean): number {
  const dim = is2D ? 2 : 3;
  const nVertices = mesh.vertices.length / dim;

  if (nVertices === 0) return 1;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = is2D ? 0 : Number.POSITIVE_INFINITY;
  let maxZ = is2D ? 0 : Number.NEGATIVE_INFINITY;

  for (let i = 0; i < nVertices; i++) {
    const x = mesh.vertices[i * dim] ?? 0;
    const y = mesh.vertices[i * dim + 1] ?? 0;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    if (!is2D) {
      const z = mesh.vertices[i * dim + 2] ?? 0;
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }

  const dx = maxX - minX;
  const dy = maxY - minY;
  const dz = maxZ - minZ;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Paint the size field at a given point
 * Returns the updated size field
 */
export function paintSizeField(
  sizeField: Float64Array,
  mesh: MeshData,
  is2D: boolean,
  hitPoint: THREE.Vector3 | { x: number; y: number },
  brushSettings: BrushSettings,
  meshDiagonal: number,
): Float64Array {
  const dim = is2D ? 2 : 3;
  const nVertices = mesh.vertices.length / dim;
  const brushRadius = brushSettings.radius * meshDiagonal;
  const brushRadius2 = brushRadius * brushRadius;

  // Clone the size field
  const newField = new Float64Array(sizeField);

  for (let i = 0; i < nVertices; i++) {
    const vx = mesh.vertices[i * dim] ?? 0;
    const vy = mesh.vertices[i * dim + 1] ?? 0;
    const vz = is2D ? 0 : (mesh.vertices[i * dim + 2] ?? 0);

    const dx = vx - hitPoint.x;
    const dy = vy - hitPoint.y;
    const dz = is2D ? 0 : vz - (hitPoint as THREE.Vector3).z;
    const dist2 = dx * dx + dy * dy + dz * dz;

    if (dist2 <= brushRadius2) {
      const dist = Math.sqrt(dist2);
      let influence: number;

      if (brushSettings.falloff === "hard") {
        // Hard falloff - full influence within radius
        influence = brushSettings.strength;
      } else {
        // Smooth falloff - cubic ease out
        const t = dist / brushRadius;
        const smoothT = 1 - t * t * (3 - 2 * t); // smoothstep
        influence = smoothT * brushSettings.strength;
      }

      // Blend between current size and target size
      const currentSize = newField[i] ?? brushSettings.targetSize;
      newField[i] = lerp(currentSize, brushSettings.targetSize, influence);
    }
  }

  return newField;
}

/**
 * Linear interpolation
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Convert size field to vertex colors for visualization
 * Uses blue (fine/small) to red (coarse/large) color mapping
 */
export function sizeFieldToColors(
  sizeField: Float64Array,
  nTris: number,
  triangles: Int32Array,
): Float32Array {
  if (sizeField.length === 0 || nTris === 0) {
    return new Float32Array(0);
  }

  // Find min/max for normalization
  let minSize = Number.POSITIVE_INFINITY;
  let maxSize = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < sizeField.length; i++) {
    const size = sizeField[i] ?? 0;
    minSize = Math.min(minSize, size);
    maxSize = Math.max(maxSize, size);
  }

  // Avoid division by zero
  const range = maxSize - minSize || 1;

  // Create per-vertex colors (3 floats per vertex per triangle corner)
  const colors = new Float32Array(nTris * 3 * 3);

  for (let tri = 0; tri < nTris; tri++) {
    for (let corner = 0; corner < 3; corner++) {
      // MMG uses 1-indexed vertices
      const triIdx = triangles[tri * 3 + corner];
      const vertIdx = (triIdx ?? 1) - 1;
      const size = sizeField[vertIdx] ?? (minSize + maxSize) / 2;
      const t = (size - minSize) / range;

      // Blue (fine) to Red (coarse) color ramp
      const [r, g, b] = sizeToColor(t);

      const colorIdx = (tri * 3 + corner) * 3;
      colors[colorIdx] = r;
      colors[colorIdx + 1] = g;
      colors[colorIdx + 2] = b;
    }
  }

  return colors;
}

/**
 * Convert normalized size (0-1) to RGB color
 * 0 = blue (fine), 1 = red (coarse)
 * Uses a perceptually uniform blue-white-red diverging colormap
 */
function sizeToColor(t: number): [number, number, number] {
  // Clamp t to [0, 1]
  t = Math.max(0, Math.min(1, t));

  if (t < 0.5) {
    // Blue to white
    const s = t * 2; // 0 to 1
    return [s, s, 1];
  } else {
    // White to red
    const s = (t - 0.5) * 2; // 0 to 1
    return [1, 1 - s, 1 - s];
  }
}

/**
 * Get the brush circle geometry for 3D visualization
 */
export function createBrushCircle(
  center: THREE.Vector3,
  normal: THREE.Vector3,
  radius: number,
  segments = 32,
): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];

  // Create a coordinate system on the surface
  const tangent = new THREE.Vector3();
  const bitangent = new THREE.Vector3();

  // Find a vector not parallel to normal
  if (Math.abs(normal.x) < 0.9) {
    tangent.set(1, 0, 0);
  } else {
    tangent.set(0, 1, 0);
  }

  // Create orthonormal basis
  tangent.crossVectors(tangent, normal).normalize();
  bitangent.crossVectors(normal, tangent).normalize();

  // Create circle points
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    const point = center
      .clone()
      .addScaledVector(tangent, x)
      .addScaledVector(bitangent, y);
    points.push(point);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return geometry;
}
