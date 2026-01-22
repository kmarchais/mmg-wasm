/**
 * Local sizing constraints for mesh refinement
 *
 * These constraints allow specifying target edge sizes within geometric regions
 * (spheres, boxes, cylinders for 3D; circles, boxes for 2D).
 */

/** 2D point/vector */
export type Vec2 = [number, number];

/** 3D point/vector */
export type Vec3 = [number, number, number];

/**
 * Interface for local sizing constraints
 */
export interface LocalSizingConstraint {
  /** Compute target sizes for all vertices */
  compute(vertices: Float64Array, dimension: 2 | 3): Float64Array;
}

/**
 * Spherical refinement region (3D only)
 */
export class SphereSizingConstraint implements LocalSizingConstraint {
  constructor(
    readonly center: Vec3,
    readonly radius: number,
    readonly size: number,
  ) {
    if (radius <= 0) {
      throw new Error("radius must be positive");
    }
    if (size <= 0) {
      throw new Error("size must be positive");
    }
    if (center.length !== 3) {
      throw new Error("center must be [x, y, z]");
    }
    for (let i = 0; i < 3; i++) {
      if (!Number.isFinite(center[i])) {
        throw new Error("center coordinates must be finite numbers");
      }
    }
    if (!Number.isFinite(radius) || !Number.isFinite(size)) {
      throw new Error("radius and size must be finite");
    }
  }

  compute(vertices: Float64Array, dimension: 2 | 3): Float64Array {
    if (dimension !== 3) {
      throw new Error("SphereSizingConstraint only works with 3D meshes");
    }

    const nVertices = vertices.length / 3;
    const sizes = new Float64Array(nVertices);
    sizes.fill(Number.POSITIVE_INFINITY);

    const [cx, cy, cz] = this.center;
    const r2 = this.radius * this.radius;

    for (let i = 0; i < nVertices; i++) {
      const x = vertices[i * 3];
      const y = vertices[i * 3 + 1];
      const z = vertices[i * 3 + 2];

      const dx = x - cx;
      const dy = y - cy;
      const dz = z - cz;
      const dist2 = dx * dx + dy * dy + dz * dz;

      if (dist2 <= r2) {
        sizes[i] = this.size;
      }
    }

    return sizes;
  }
}

/**
 * Circular refinement region (2D only)
 */
export class CircleSizingConstraint implements LocalSizingConstraint {
  constructor(
    readonly center: Vec2,
    readonly radius: number,
    readonly size: number,
  ) {
    if (radius <= 0) {
      throw new Error("radius must be positive");
    }
    if (size <= 0) {
      throw new Error("size must be positive");
    }
    if (center.length !== 2) {
      throw new Error("center must be [x, y]");
    }
    for (let i = 0; i < 2; i++) {
      if (!Number.isFinite(center[i])) {
        throw new Error("center coordinates must be finite numbers");
      }
    }
    if (!Number.isFinite(radius) || !Number.isFinite(size)) {
      throw new Error("radius and size must be finite");
    }
  }

  compute(vertices: Float64Array, dimension: 2 | 3): Float64Array {
    if (dimension !== 2) {
      throw new Error("CircleSizingConstraint only works with 2D meshes");
    }

    const nVertices = vertices.length / 2;
    const sizes = new Float64Array(nVertices);
    sizes.fill(Number.POSITIVE_INFINITY);

    const [cx, cy] = this.center;
    const r2 = this.radius * this.radius;

    for (let i = 0; i < nVertices; i++) {
      const x = vertices[i * 2];
      const y = vertices[i * 2 + 1];

      const dx = x - cx;
      const dy = y - cy;
      const dist2 = dx * dx + dy * dy;

      if (dist2 <= r2) {
        sizes[i] = this.size;
      }
    }

    return sizes;
  }
}

/**
 * Box refinement region (2D and 3D)
 */
export class BoxSizingConstraint implements LocalSizingConstraint {
  private readonly minCoords: number[];
  private readonly maxCoords: number[];
  private readonly expectedDim: number;

  constructor(
    min: Vec2 | Vec3,
    max: Vec2 | Vec3,
    readonly size: number,
  ) {
    if (size <= 0) {
      throw new Error("size must be positive");
    }
    if (!Number.isFinite(size)) {
      throw new Error("size must be finite");
    }

    if (min.length !== max.length) {
      throw new Error("min and max must have the same dimension");
    }

    this.expectedDim = min.length;

    for (let i = 0; i < min.length; i++) {
      if (!Number.isFinite(min[i]) || !Number.isFinite(max[i])) {
        throw new Error("min and max coordinates must be finite numbers");
      }
      if (min[i] >= max[i]) {
        throw new Error("min must be less than max in all dimensions");
      }
    }

    this.minCoords = Array.from(min);
    this.maxCoords = Array.from(max);
  }

  compute(vertices: Float64Array, dimension: 2 | 3): Float64Array {
    if (dimension !== this.expectedDim) {
      throw new Error(
        `${this.expectedDim}D BoxSizingConstraint cannot be used with ${dimension}D meshes`,
      );
    }

    const nVertices = vertices.length / dimension;
    const sizes = new Float64Array(nVertices);
    sizes.fill(Number.POSITIVE_INFINITY);

    if (dimension === 3) {
      const [minX, minY, minZ] = this.minCoords;
      const [maxX, maxY, maxZ] = this.maxCoords;

      for (let i = 0; i < nVertices; i++) {
        const x = vertices[i * 3];
        const y = vertices[i * 3 + 1];
        const z = vertices[i * 3 + 2];

        if (
          x >= minX &&
          x <= maxX &&
          y >= minY &&
          y <= maxY &&
          z >= minZ &&
          z <= maxZ
        ) {
          sizes[i] = this.size;
        }
      }
    } else {
      const [minX, minY] = this.minCoords;
      const [maxX, maxY] = this.maxCoords;

      for (let i = 0; i < nVertices; i++) {
        const x = vertices[i * 2];
        const y = vertices[i * 2 + 1];

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          sizes[i] = this.size;
        }
      }
    }

    return sizes;
  }
}

/**
 * Cylindrical refinement region (3D only)
 */
export class CylinderSizingConstraint implements LocalSizingConstraint {
  constructor(
    readonly p1: Vec3,
    readonly p2: Vec3,
    readonly radius: number,
    readonly size: number,
  ) {
    if (radius <= 0) {
      throw new Error("radius must be positive");
    }
    if (size <= 0) {
      throw new Error("size must be positive");
    }
    if (p1.length !== 3 || p2.length !== 3) {
      throw new Error("p1 and p2 must be [x, y, z]");
    }
    for (let i = 0; i < 3; i++) {
      if (!Number.isFinite(p1[i]) || !Number.isFinite(p2[i])) {
        throw new Error("p1 and p2 coordinates must be finite numbers");
      }
    }
    if (!Number.isFinite(radius) || !Number.isFinite(size)) {
      throw new Error("radius and size must be finite");
    }

    // Check that p1 and p2 are different
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = p2[2] - p1[2];
    if (dx * dx + dy * dy + dz * dz === 0) {
      throw new Error("p1 and p2 must be different points");
    }
  }

  compute(vertices: Float64Array, dimension: 2 | 3): Float64Array {
    if (dimension !== 3) {
      throw new Error("CylinderSizingConstraint only works with 3D meshes");
    }

    const nVertices = vertices.length / 3;
    const sizes = new Float64Array(nVertices);
    sizes.fill(Number.POSITIVE_INFINITY);

    const [p1x, p1y, p1z] = this.p1;
    const [p2x, p2y, p2z] = this.p2;

    // Axis vector
    const ax = p2x - p1x;
    const ay = p2y - p1y;
    const az = p2z - p1z;
    const lenSq = ax * ax + ay * ay + az * az;

    const r2 = this.radius * this.radius;

    for (let i = 0; i < nVertices; i++) {
      const vx = vertices[i * 3];
      const vy = vertices[i * 3 + 1];
      const vz = vertices[i * 3 + 2];

      // Vector from p1 to vertex
      const dx = vx - p1x;
      const dy = vy - p1y;
      const dz = vz - p1z;

      // Parameter t for projection onto axis
      let t = (dx * ax + dy * ay + dz * az) / lenSq;
      t = Math.max(0, Math.min(1, t)); // Clamp to segment

      // Closest point on axis
      const closestX = p1x + t * ax;
      const closestY = p1y + t * ay;
      const closestZ = p1z + t * az;

      // Distance to axis
      const rdx = vx - closestX;
      const rdy = vy - closestY;
      const rdz = vz - closestZ;
      const radialDist2 = rdx * rdx + rdy * rdy + rdz * rdz;

      if (radialDist2 <= r2) {
        sizes[i] = this.size;
      }
    }

    return sizes;
  }
}

/**
 * Combine multiple sizing constraints by taking the minimum size at each vertex
 */
export function combineSizingConstraints(
  constraints: LocalSizingConstraint[],
  vertices: Float64Array,
  dimension: 2 | 3,
): Float64Array {
  const nVertices = vertices.length / dimension;
  const combined = new Float64Array(nVertices);
  combined.fill(Number.POSITIVE_INFINITY);

  for (const constraint of constraints) {
    const sizes = constraint.compute(vertices, dimension);
    for (let i = 0; i < nVertices; i++) {
      if (sizes[i] < combined[i]) {
        combined[i] = sizes[i];
      }
    }
  }

  return combined;
}
