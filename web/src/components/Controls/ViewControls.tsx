import { useMeshStore } from "@/stores/meshStore";
import type { ColormapName, QualityMetric, MeshType } from "@/types/mesh";

const colormaps: { id: ColormapName; label: string }[] = [
  { id: "RdYlBu", label: "RdYlBu" },
  { id: "viridis", label: "Viridis" },
  { id: "plasma", label: "Plasma" },
  { id: "coolwarm", label: "Coolwarm" },
  { id: "jet", label: "Jet" },
];

const qualityMetrics: { id: QualityMetric; label: string }[] = [
  { id: "mmgQuality", label: "MMG Quality" },
];

interface ViewControlsProps {
  show3DControls?: boolean;
  meshType?: MeshType;
}

export function ViewControls({ show3DControls = true, meshType }: ViewControlsProps) {
  const {
    viewerOptions,
    setViewerOption,
    clippingPosition,
    setClippingPosition,
  } = useMeshStore();

  return (
    <div className="panel">
      <h2 className="panel-header">View Options</h2>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={viewerOptions.showWireframe}
            onChange={(e) => setViewerOption("showWireframe", e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Show wireframe</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={viewerOptions.showVertices}
            onChange={(e) => setViewerOption("showVertices", e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Show vertices</span>
        </label>

        {show3DControls && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={viewerOptions.showFaces}
              onChange={(e) => setViewerOption("showFaces", e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show faces</span>
          </label>
        )}
      </div>

      {show3DControls && (
        <>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="input-label">Quality Metric</label>
            <select
              value={viewerOptions.qualityMetric ?? ""}
              onChange={(e) =>
                setViewerOption(
                  "qualityMetric",
                  e.target.value ? (e.target.value as QualityMetric) : null
                )
              }
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 shadow-sm text-sm"
            >
              <option value="">None</option>
              {qualityMetrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {viewerOptions.qualityMetric && (
            <div className="mt-3">
              <label className="input-label">Colormap</label>
              <select
                value={viewerOptions.colormap}
                onChange={(e) =>
                  setViewerOption("colormap", e.target.value as ColormapName)
                }
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 shadow-sm text-sm"
              >
                {colormaps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {meshType === "mmg3d" && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="input-label">Clip position</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={clippingPosition}
                onChange={(e) => setClippingPosition(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
