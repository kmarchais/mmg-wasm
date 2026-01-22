import { useMeshStore } from "@/stores/meshStore";
import { generateColorBarGradient } from "@/utils/colorMapping";
import { getMetricLabel } from "@/utils/meshQuality";

interface ColorBarProps {
  min: number;
  max: number;
}

export function ColorBar({ min, max }: ColorBarProps) {
  const { viewerOptions } = useMeshStore();

  if (!viewerOptions.qualityMetric) return null;

  const gradient = generateColorBarGradient(viewerOptions.colormap);
  const label = getMetricLabel(viewerOptions.qualityMetric);

  return (
    <div className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {label}
        </p>
        <span
          className="text-xs text-gray-400 dark:text-gray-500 cursor-help"
          title="Quality metric: 0 = degenerate/worst, 1 = best attainable. Values closer to 1 indicate better element quality."
        >
          0 (worst) → 1 (best)
        </span>
      </div>
      <div className="h-4 w-full rounded" style={{ background: gradient }} />
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>{min.toFixed(3)}</span>
        <span>{max.toFixed(3)}</span>
      </div>
    </div>
  );
}
