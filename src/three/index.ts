/**
 * Three.js integration utilities for mmg-wasm
 *
 * Provides conversion functions between Three.js BufferGeometry and mmg-wasm Mesh.
 * Three.js is an optional peer dependency - these utilities only work when Three.js is installed.
 *
 * @example
 * ```typescript
 * import { fromThreeGeometry, toThreeGeometry } from 'mmg-wasm/three';
 * import * as THREE from 'three';
 *
 * // Convert Three.js geometry to mmg-wasm Mesh
 * const geometry = new THREE.BoxGeometry(1, 1, 1);
 * const mesh = fromThreeGeometry(geometry);
 *
 * // Remesh
 * const result = await mesh.remesh({ hmax: 0.1 });
 *
 * // Convert back to Three.js
 * const newGeometry = await toThreeGeometry(result.mesh);
 * ```
 *
 * @module three
 */

import type { BufferAttribute, BufferGeometry } from "three";
import { Mesh, MeshType } from "../mesh";

/**
 * Options for converting Three.js BufferGeometry to mmg-wasm Mesh
 */
export interface FromThreeOptions {
  /**
   * Force a specific mesh type instead of auto-detecting.
   * By default, 3D geometries are treated as surface meshes (MeshS).
   */
  type?: MeshType;
}

/**
 * Options for converting mmg-wasm Mesh to Three.js BufferGeometry
 */
export interface ToThreeOptions {
  /**
   * Compute vertex normals after conversion.
   * @default true
   */
  computeNormals?: boolean;
}

/**
 * Convert a Three.js BufferGeometry to an mmg-wasm Mesh
 *
 * This function extracts vertex positions and face indices from a BufferGeometry
 * and creates an mmg-wasm Mesh suitable for remeshing operations.
 *
 * @param geometry - The Three.js BufferGeometry to convert
 * @param options - Conversion options
 * @returns A new mmg-wasm Mesh instance
 * @throws Error if the geometry has no position attribute
 * @throws Error if the geometry has no faces (neither indexed nor with enough vertices)
 *
 * @example
 * ```typescript
 * import { fromThreeGeometry } from 'mmg-wasm/three';
 * import * as THREE from 'three';
 *
 * const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
 * const mesh = fromThreeGeometry(boxGeometry);
 *
 * // Can now remesh
 * const result = await mesh.remesh({ hmax: 0.1 });
 * ```
 *
 * @example
 * ```typescript
 * // Force 2D mesh type for flat geometries
 * const planeGeometry = new THREE.PlaneGeometry(1, 1);
 * const mesh = fromThreeGeometry(planeGeometry, { type: MeshType.Mesh2D });
 * ```
 */
export function fromThreeGeometry(
  geometry: BufferGeometry,
  options: FromThreeOptions = {},
): Mesh {
  const positions = geometry.attributes.position;
  if (!positions) {
    throw new Error("Geometry must have a position attribute");
  }

  const itemSize = positions.itemSize;
  if (itemSize !== 3 && itemSize !== 2) {
    throw new Error(
      `Position attribute must have itemSize 2 or 3, got ${itemSize}`,
    );
  }

  const positionCount = positions.count;
  if (positionCount < 3) {
    throw new Error(
      `Geometry must have at least 3 vertices, got ${positionCount}`,
    );
  }

  // Extract vertices as Float64Array
  // Convert from Float32 (WebGL standard) to Float64 (mmg requirement)
  // Use getX/getY/getZ methods which work for both BufferAttribute and InterleavedBufferAttribute
  const vertices = new Float64Array(positionCount * itemSize);
  const posAttr = positions as BufferAttribute;
  for (let i = 0; i < positionCount; i++) {
    vertices[i * itemSize] = posAttr.getX(i);
    vertices[i * itemSize + 1] = posAttr.getY(i);
    if (itemSize === 3) {
      vertices[i * itemSize + 2] = posAttr.getZ(i);
    }
  }

  // Extract indices
  let cells: Int32Array;
  if (geometry.index) {
    // Indexed geometry: convert to 1-indexed for MMG
    const indexArray = geometry.index.array;
    const indexCount = geometry.index.count;

    if (indexCount < 3 || indexCount % 3 !== 0) {
      throw new Error(
        `Geometry index count must be divisible by 3, got ${indexCount}`,
      );
    }

    cells = new Int32Array(indexCount);
    for (let i = 0; i < indexCount; i++) {
      // Convert from 0-indexed (Three.js) to 1-indexed (MMG)
      cells[i] = indexArray[i] + 1;
    }
  } else {
    // Non-indexed geometry: every 3 vertices form a triangle
    if (positionCount % 3 !== 0) {
      throw new Error(
        `Non-indexed geometry vertex count must be divisible by 3, got ${positionCount}`,
      );
    }

    cells = new Int32Array(positionCount);
    for (let i = 0; i < positionCount; i++) {
      // Convert from 0-indexed to 1-indexed
      cells[i] = i + 1;
    }
  }

  // Determine mesh type
  let type = options.type;
  if (!type) {
    if (itemSize === 2) {
      type = MeshType.Mesh2D;
    } else {
      // 3D geometry - default to surface mesh
      type = MeshType.MeshS;
    }
  }

  return new Mesh({
    vertices,
    cells,
    type,
  });
}

/**
 * Convert an mmg-wasm Mesh to a Three.js BufferGeometry
 *
 * This function creates a new BufferGeometry from the mesh's vertices and cells.
 * For volumetric meshes (Mesh3D), the boundary faces are extracted for visualization.
 *
 * @param mesh - The mmg-wasm Mesh to convert
 * @param options - Conversion options
 * @returns A Promise resolving to a new Three.js BufferGeometry
 * @throws Error if Three.js is not installed
 *
 * @example
 * ```typescript
 * import { toThreeGeometry } from 'mmg-wasm/three';
 *
 * const result = await mesh.remesh({ hmax: 0.1 });
 * const geometry = await toThreeGeometry(result.mesh);
 *
 * // Use in Three.js scene
 * const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
 * const threeMesh = new THREE.Mesh(geometry, material);
 * scene.add(threeMesh);
 * ```
 *
 * @example
 * ```typescript
 * // Skip normal computation
 * const geometry = await toThreeGeometry(mesh, { computeNormals: false });
 * ```
 */
export async function toThreeGeometry(
  mesh: Mesh,
  options: ToThreeOptions = {},
): Promise<BufferGeometry> {
  const { computeNormals = true } = options;

  // Dynamic import of Three.js to avoid bundling if not used
  let THREE: typeof import("three");
  try {
    THREE = await import("three");
  } catch {
    throw new Error(
      "Three.js is not installed. Install it with: npm install three",
    );
  }

  const geometry = new THREE.BufferGeometry();

  // Get mesh data
  const vertices = mesh.vertices;
  const dimension = mesh.dimension;

  // For volumetric meshes, use boundary faces for visualization
  // For surface/2D meshes, use the cells directly
  let triangleIndices: Int32Array;
  if (mesh.type === MeshType.Mesh3D) {
    // Extract boundary triangles for volumetric meshes
    triangleIndices = mesh.boundaryFaces;
  } else {
    triangleIndices = mesh.cells;
  }

  // Convert vertices from Float64 to Float32 (WebGL requirement)
  // Also handle 2D vertices by adding z=0
  let positions: Float32Array;
  if (dimension === 2) {
    // 2D mesh: add z=0 for each vertex
    const nVertices = vertices.length / 2;
    positions = new Float32Array(nVertices * 3);
    for (let i = 0; i < nVertices; i++) {
      positions[i * 3] = vertices[i * 2];
      positions[i * 3 + 1] = vertices[i * 2 + 1];
      positions[i * 3 + 2] = 0;
    }
  } else {
    // 3D mesh: direct conversion
    positions = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length; i++) {
      positions[i] = vertices[i];
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Convert 1-indexed cells to 0-indexed for Three.js
  const indices: number[] = [];
  for (let i = 0; i < triangleIndices.length; i++) {
    indices.push(triangleIndices[i] - 1);
  }
  geometry.setIndex(indices);

  // Compute normals if requested
  if (computeNormals) {
    geometry.computeVertexNormals();
  }

  return geometry;
}

/**
 * Synchronous version of toThreeGeometry for use when Three.js is already imported
 *
 * This function requires Three.js to be passed as a parameter, avoiding the async import.
 * Use this when you already have Three.js loaded and want synchronous conversion.
 *
 * @param mesh - The mmg-wasm Mesh to convert
 * @param THREE - The Three.js module
 * @param options - Conversion options
 * @returns A new Three.js BufferGeometry
 *
 * @example
 * ```typescript
 * import * as THREE from 'three';
 * import { toThreeGeometrySync } from 'mmg-wasm/three';
 *
 * const geometry = toThreeGeometrySync(mesh, THREE);
 * ```
 */
export function toThreeGeometrySync(
  mesh: Mesh,
  THREE: typeof import("three"),
  options: ToThreeOptions = {},
): BufferGeometry {
  const { computeNormals = true } = options;

  const geometry = new THREE.BufferGeometry();

  // Get mesh data
  const vertices = mesh.vertices;
  const dimension = mesh.dimension;

  // For volumetric meshes, use boundary faces for visualization
  let triangleIndices: Int32Array;
  if (mesh.type === MeshType.Mesh3D) {
    triangleIndices = mesh.boundaryFaces;
  } else {
    triangleIndices = mesh.cells;
  }

  // Convert vertices from Float64 to Float32
  let positions: Float32Array;
  if (dimension === 2) {
    const nVertices = vertices.length / 2;
    positions = new Float32Array(nVertices * 3);
    for (let i = 0; i < nVertices; i++) {
      positions[i * 3] = vertices[i * 2];
      positions[i * 3 + 1] = vertices[i * 2 + 1];
      positions[i * 3 + 2] = 0;
    }
  } else {
    positions = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length; i++) {
      positions[i] = vertices[i];
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Convert 1-indexed to 0-indexed
  const indices: number[] = [];
  for (let i = 0; i < triangleIndices.length; i++) {
    indices.push(triangleIndices[i] - 1);
  }
  geometry.setIndex(indices);

  if (computeNormals) {
    geometry.computeVertexNormals();
  }

  return geometry;
}
