import type { ColormapName, MeshData, QualityMetric } from "@/types/mesh";
import { getColor } from "@/utils/colorMapping";
import { getMetricRange } from "@/utils/meshQuality";
import * as THREE from "three";

interface BoundingBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
}

interface GeometryResult {
  geometry: THREE.BufferGeometry;
  wireframeGeometry: THREE.BufferGeometry;
  pointsGeometry: THREE.BufferGeometry;
  tetFaceColors: Float32Array | null;
}

/**
 * Safely access a value from a typed array with bounds checking
 */
function safeGet(
  arr: Float64Array | Float32Array | Int32Array,
  index: number,
  defaultValue = 0,
): number {
  if (index < 0 || index >= arr.length) return defaultValue;
  return arr[index] ?? defaultValue;
}

/**
 * Create centered positions array from vertices
 */
export function createCenteredPositions(
  vertices: Float64Array,
  nVerts: number,
  center: THREE.Vector3,
  is3D = true,
): Float32Array {
  const coordsPerVert = is3D ? 3 : 2;
  const positions = new Float32Array(nVerts * 3);

  for (let i = 0; i < nVerts; i++) {
    positions[i * 3] = safeGet(vertices, i * coordsPerVert) - center.x;
    positions[i * 3 + 1] = safeGet(vertices, i * coordsPerVert + 1) - center.y;
    positions[i * 3 + 2] = is3D
      ? safeGet(vertices, i * coordsPerVert + 2) - center.z
      : 0;
  }

  return positions;
}

/**
 * Build geometry for clipped tetrahedra view
 */
export function buildClippedTetrahedraGeometry(
  mesh: MeshData,
  positions: Float32Array,
  clipThreshold: number,
  qualityMetric: QualityMetric | null,
  colormap: ColormapName,
): GeometryResult {
  const vertices = mesh.vertices;
  const tetrahedra = mesh.tetrahedra;

  if (!tetrahedra) {
    throw new Error("No tetrahedra data for clipped view");
  }

  const nTets = tetrahedra.length / 4;

  // Filter tetrahedra by centroid position
  const visibleTetIndices: number[][] = [];
  const visibleTetOriginalIndices: number[] = [];

  for (let i = 0; i < nTets; i++) {
    const v0Idx = safeGet(tetrahedra, i * 4) - 1;
    const v1Idx = safeGet(tetrahedra, i * 4 + 1) - 1;
    const v2Idx = safeGet(tetrahedra, i * 4 + 2) - 1;
    const v3Idx = safeGet(tetrahedra, i * 4 + 3) - 1;

    // Compute centroid x coordinate (in original mesh coordinates)
    const centroidX =
      (safeGet(vertices, v0Idx * 3) +
        safeGet(vertices, v1Idx * 3) +
        safeGet(vertices, v2Idx * 3) +
        safeGet(vertices, v3Idx * 3)) /
      4;

    if (centroidX < clipThreshold) {
      visibleTetIndices.push([v0Idx, v1Idx, v2Idx, v3Idx]);
      visibleTetOriginalIndices.push(i);
    }
  }

  // Build non-indexed faces for visible tetrahedra
  const nVisibleTets = visibleTetIndices.length;
  const nFaces = nVisibleTets * 4;
  const facePositions = new Float32Array(nFaces * 9);
  const tetIndices: number[] = [];

  let faceIdx = 0;
  for (let tetIdx = 0; tetIdx < visibleTetIndices.length; tetIdx++) {
    const tetVerts = visibleTetIndices[tetIdx];
    if (!tetVerts) continue;

    const v0 = tetVerts[0] ?? 0;
    const v1 = tetVerts[1] ?? 0;
    const v2 = tetVerts[2] ?? 0;
    const v3 = tetVerts[3] ?? 0;
    const origTetIdx = visibleTetOriginalIndices[tetIdx] ?? 0;

    // 4 faces per tetrahedron
    const faces = [
      [v0, v2, v1],
      [v0, v1, v3],
      [v0, v3, v2],
      [v1, v2, v3],
    ];

    for (const face of faces) {
      tetIndices.push(origTetIdx);
      for (let j = 0; j < 3; j++) {
        const vIdx = (face[j] ?? 0) * 3;
        facePositions[faceIdx * 9 + j * 3] = safeGet(positions, vIdx);
        facePositions[faceIdx * 9 + j * 3 + 1] = safeGet(positions, vIdx + 1);
        facePositions[faceIdx * 9 + j * 3 + 2] = safeGet(positions, vIdx + 2);
      }
      faceIdx++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(facePositions, 3),
  );
  geometry.computeVertexNormals();

  // Compute quality colors for tetrahedra faces
  let tetFaceColors: Float32Array | null = null;
  if (
    qualityMetric &&
    mesh.quality &&
    mesh.quality.length > 0 &&
    tetIndices.length > 0
  ) {
    const range = getMetricRange(mesh.quality);
    tetFaceColors = new Float32Array(tetIndices.length * 9);

    for (let i = 0; i < tetIndices.length; i++) {
      const tetIdx = tetIndices[i] ?? 0;
      const quality = mesh.quality[tetIdx] ?? 0;
      const color = getColor(quality, range.min, range.max, colormap);

      for (let j = 0; j < 3; j++) {
        tetFaceColors[i * 9 + j * 3] = color.r;
        tetFaceColors[i * 9 + j * 3 + 1] = color.g;
        tetFaceColors[i * 9 + j * 3 + 2] = color.b;
      }
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(tetFaceColors, 3));
  }

  // Build wireframe for visible tetrahedra
  const wireframeGeometry = new THREE.BufferGeometry();
  const linePositions: number[] = [];

  for (const tetVerts of visibleTetIndices) {
    if (!tetVerts) continue;
    const v0 = (tetVerts[0] ?? 0) * 3;
    const v1 = (tetVerts[1] ?? 0) * 3;
    const v2 = (tetVerts[2] ?? 0) * 3;
    const v3 = (tetVerts[3] ?? 0) * 3;

    // 6 edges per tetrahedron
    const edges = [
      [v0, v1],
      [v0, v2],
      [v0, v3],
      [v1, v2],
      [v1, v3],
      [v2, v3],
    ];

    for (const edge of edges) {
      const start = edge[0] ?? 0;
      const end = edge[1] ?? 0;
      linePositions.push(
        safeGet(positions, start),
        safeGet(positions, start + 1),
        safeGet(positions, start + 2),
        safeGet(positions, end),
        safeGet(positions, end + 1),
        safeGet(positions, end + 2),
      );
    }
  }

  if (linePositions.length > 0) {
    wireframeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3),
    );
  }

  // Points geometry
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );

  return { geometry, wireframeGeometry, pointsGeometry, tetFaceColors };
}

/**
 * Build geometry for surface triangles (non-clipped view)
 */
export function buildSurfaceGeometry(
  mesh: MeshData,
  positions: Float32Array,
  nTris: number,
): GeometryResult {
  const triangles = mesh.triangles;
  const geometry = new THREE.BufferGeometry();

  if (triangles && nTris > 0) {
    const facePositions = new Float32Array(nTris * 9);

    for (let i = 0; i < nTris; i++) {
      for (let j = 0; j < 3; j++) {
        const vIdx = (safeGet(triangles, i * 3 + j) - 1) * 3;
        facePositions[(i * 3 + j) * 3] = safeGet(positions, vIdx);
        facePositions[(i * 3 + j) * 3 + 1] = safeGet(positions, vIdx + 1);
        facePositions[(i * 3 + j) * 3 + 2] = safeGet(positions, vIdx + 2);
      }
    }

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(facePositions, 3),
    );
    geometry.computeVertexNormals();
  }

  // Create wireframe geometry from triangles
  const wireframeGeometry = new THREE.BufferGeometry();
  if (triangles && nTris > 0) {
    const linePositions: number[] = [];

    for (let i = 0; i < nTris; i++) {
      const i0 = (safeGet(triangles, i * 3) - 1) * 3;
      const i1 = (safeGet(triangles, i * 3 + 1) - 1) * 3;
      const i2 = (safeGet(triangles, i * 3 + 2) - 1) * 3;

      // Three edges per triangle
      const edges = [
        [i0, i1],
        [i1, i2],
        [i2, i0],
      ];

      for (const edge of edges) {
        const start = edge[0] ?? 0;
        const end = edge[1] ?? 0;
        linePositions.push(
          safeGet(positions, start),
          safeGet(positions, start + 1),
          safeGet(positions, start + 2),
          safeGet(positions, end),
          safeGet(positions, end + 1),
          safeGet(positions, end + 2),
        );
      }
    }

    wireframeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3),
    );
  }

  // Create points geometry
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );

  return { geometry, wireframeGeometry, pointsGeometry, tetFaceColors: null };
}

/**
 * Compute the bounding box and center of a mesh
 */
export function computeBoundingBox(mesh: MeshData): BoundingBox {
  const vertices = mesh.vertices;
  const nVerts = vertices.length / 3;

  let minX = Number.POSITIVE_INFINITY,
    minY = Number.POSITIVE_INFINITY,
    minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY,
    maxY = Number.NEGATIVE_INFINITY,
    maxZ = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < nVerts; i++) {
    const x = safeGet(vertices, i * 3);
    const y = safeGet(vertices, i * 3 + 1);
    const z = safeGet(vertices, i * 3 + 2);

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  return {
    min: new THREE.Vector3(minX, minY, minZ),
    max: new THREE.Vector3(maxX, maxY, maxZ),
    center: new THREE.Vector3(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
    ),
  };
}
