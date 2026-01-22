import type { ColormapName } from "@/types/mesh";
import { Color } from "three";

type RGB = [number, number, number];

const colormaps: Record<ColormapName, RGB[]> = {
  RdYlBu: [
    [0.647, 0.0, 0.149],
    [0.843, 0.188, 0.153],
    [0.957, 0.427, 0.263],
    [0.992, 0.682, 0.38],
    [0.996, 0.878, 0.565],
    [1.0, 1.0, 0.749],
    [0.878, 0.953, 0.973],
    [0.671, 0.851, 0.914],
    [0.455, 0.678, 0.82],
    [0.271, 0.459, 0.706],
    [0.192, 0.212, 0.584],
  ],
  viridis: [
    [0.267, 0.004, 0.329],
    [0.282, 0.141, 0.458],
    [0.253, 0.265, 0.529],
    [0.206, 0.372, 0.553],
    [0.163, 0.471, 0.558],
    [0.128, 0.567, 0.551],
    [0.134, 0.658, 0.518],
    [0.267, 0.749, 0.441],
    [0.478, 0.821, 0.318],
    [0.741, 0.873, 0.15],
    [0.993, 0.906, 0.144],
  ],
  plasma: [
    [0.05, 0.03, 0.528],
    [0.247, 0.012, 0.615],
    [0.417, 0.0, 0.658],
    [0.576, 0.027, 0.629],
    [0.716, 0.135, 0.528],
    [0.834, 0.242, 0.408],
    [0.916, 0.367, 0.286],
    [0.969, 0.509, 0.169],
    [0.988, 0.663, 0.063],
    [0.961, 0.828, 0.106],
    [0.94, 0.975, 0.131],
  ],
  coolwarm: [
    [0.227, 0.298, 0.753],
    [0.35, 0.427, 0.851],
    [0.502, 0.569, 0.926],
    [0.663, 0.706, 0.969],
    [0.816, 0.831, 0.976],
    [0.867, 0.867, 0.867],
    [0.957, 0.808, 0.784],
    [0.953, 0.663, 0.608],
    [0.918, 0.506, 0.439],
    [0.851, 0.337, 0.298],
    [0.706, 0.016, 0.149],
  ],
  jet: [
    [0.0, 0.0, 0.5],
    [0.0, 0.0, 1.0],
    [0.0, 0.5, 1.0],
    [0.0, 1.0, 1.0],
    [0.5, 1.0, 0.5],
    [1.0, 1.0, 0.0],
    [1.0, 0.5, 0.0],
    [1.0, 0.0, 0.0],
    [0.5, 0.0, 0.0],
  ],
};

function interpolateColor(colors: RGB[], t: number): RGB {
  const clampedT = Math.max(0, Math.min(1, t));
  const n = colors.length - 1;
  const idx = clampedT * n;
  const lower = Math.floor(idx);
  const upper = Math.min(lower + 1, n);
  const frac = idx - lower;

  const c1 = colors[lower]!;
  const c2 = colors[upper]!;

  return [
    c1[0] + frac * (c2[0] - c1[0]),
    c1[1] + frac * (c2[1] - c1[1]),
    c1[2] + frac * (c2[2] - c1[2]),
  ];
}

export function getColor(
  value: number,
  min: number,
  max: number,
  colormap: ColormapName
): Color {
  const range = max - min;
  const t = range > 0 ? (value - min) / range : 0.5;
  const [r, g, b] = interpolateColor(colormaps[colormap] ?? colormaps.RdYlBu, t);
  return new Color(r, g, b);
}

export function getColorArray(
  values: Float32Array | Float64Array,
  colormap: ColormapName
): Float32Array {
  const colors = new Float32Array(values.length * 3);
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const range = max - min;
  const cmapColors = colormaps[colormap] ?? colormaps.RdYlBu;

  for (let i = 0; i < values.length; i++) {
    const t = range > 0 ? (values[i]! - min) / range : 0.5;
    const [r, g, b] = interpolateColor(cmapColors, t);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  return colors;
}

export function generateColorBarGradient(colormap: ColormapName): string {
  const colors = colormaps[colormap] ?? colormaps.RdYlBu;
  const stops = colors
    .map((c, i) => {
      const percent = (i / (colors.length - 1)) * 100;
      const [r, g, b] = c;
      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}) ${percent}%`;
    })
    .join(", ");

  return `linear-gradient(to right, ${stops})`;
}
