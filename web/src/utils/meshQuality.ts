import type { QualityMetric } from "@/types/mesh";

export function computeTriangleQuality(
  vertices: Float64Array,
  triangles: Int32Array,
  metric: QualityMetric,
  dimensions: 2 | 3
): Float32Array {
  const nTriangles = triangles.length / 3;
  const quality = new Float32Array(nTriangles);
  const stride = dimensions;

  for (let i = 0; i < nTriangles; i++) {
    const i0 = (triangles[i * 3]! - 1) * stride;
    const i1 = (triangles[i * 3 + 1]! - 1) * stride;
    const i2 = (triangles[i * 3 + 2]! - 1) * stride;

    const v0 =
      dimensions === 2
        ? [vertices[i0]!, vertices[i0 + 1]!, 0]
        : [vertices[i0]!, vertices[i0 + 1]!, vertices[i0 + 2]!];
    const v1 =
      dimensions === 2
        ? [vertices[i1]!, vertices[i1 + 1]!, 0]
        : [vertices[i1]!, vertices[i1 + 1]!, vertices[i1 + 2]!];
    const v2 =
      dimensions === 2
        ? [vertices[i2]!, vertices[i2 + 1]!, 0]
        : [vertices[i2]!, vertices[i2 + 1]!, vertices[i2 + 2]!];

    quality[i] = computeMetric(v0, v1, v2, metric);
  }

  return quality;
}

function computeMetric(
  v0: number[],
  v1: number[],
  v2: number[],
  metric: QualityMetric
): number {
  // Edge vectors
  const e0 = [v1[0]! - v0[0]!, v1[1]! - v0[1]!, v1[2]! - v0[2]!];
  const e1 = [v2[0]! - v1[0]!, v2[1]! - v1[1]!, v2[2]! - v1[2]!];
  const e2 = [v0[0]! - v2[0]!, v0[1]! - v2[1]!, v0[2]! - v2[2]!];

  // Edge lengths
  const l0 = Math.sqrt(e0[0]! ** 2 + e0[1]! ** 2 + e0[2]! ** 2);
  const l1 = Math.sqrt(e1[0]! ** 2 + e1[1]! ** 2 + e1[2]! ** 2);
  const l2 = Math.sqrt(e2[0]! ** 2 + e2[1]! ** 2 + e2[2]! ** 2);

  switch (metric) {
    case "aspectRatio": {
      // Aspect ratio: ratio of circumradius to inradius
      // For equilateral triangle, this is 2
      const s = (l0 + l1 + l2) / 2;
      const area = Math.sqrt(
        Math.max(0, s * (s - l0) * (s - l1) * (s - l2))
      );
      if (area < 1e-12) return 0;
      const circumradius = (l0 * l1 * l2) / (4 * area);
      const inradius = area / s;
      return inradius > 0 ? circumradius / (2 * inradius) : 0;
    }

    case "minAngle": {
      // Minimum angle in degrees
      const angles = computeAngles(l0, l1, l2);
      return Math.min(...angles);
    }

    case "maxAngle": {
      // Maximum angle in degrees
      const angles = computeAngles(l0, l1, l2);
      return Math.max(...angles);
    }

    case "edgeLength": {
      // Average edge length
      return (l0 + l1 + l2) / 3;
    }

    case "area": {
      // Triangle area using Heron's formula
      const s = (l0 + l1 + l2) / 2;
      return Math.sqrt(Math.max(0, s * (s - l0) * (s - l1) * (s - l2)));
    }

    default:
      return 0;
  }
}

function computeAngles(l0: number, l1: number, l2: number): number[] {
  // Using law of cosines
  const toDeg = 180 / Math.PI;

  const angle0 =
    Math.acos(
      Math.max(-1, Math.min(1, (l0 * l0 + l2 * l2 - l1 * l1) / (2 * l0 * l2)))
    ) * toDeg;
  const angle1 =
    Math.acos(
      Math.max(-1, Math.min(1, (l0 * l0 + l1 * l1 - l2 * l2) / (2 * l0 * l1)))
    ) * toDeg;
  const angle2 = 180 - angle0 - angle1;

  return [angle0, angle1, angle2];
}

export function getMetricLabel(metric: QualityMetric): string {
  switch (metric) {
    case "aspectRatio":
      return "Aspect Ratio";
    case "minAngle":
      return "Min Angle (°)";
    case "maxAngle":
      return "Max Angle (°)";
    case "edgeLength":
      return "Avg Edge Length";
    case "area":
      return "Area";
  }
}

export function getMetricRange(
  quality: Float32Array
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
