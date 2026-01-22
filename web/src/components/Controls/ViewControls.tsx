import { useMeshStore } from "@/stores/meshStore";
import type { ColormapName, QualityMetric } from "@/types/mesh";

const colormaps: { id: ColormapName; label: string }[] = [
  { id: "RdYlBu_r", label: "RdYlBu (reversed)" },
  { id: "viridis", label: "Viridis" },
  { id: "plasma", label: "Plasma" },
  { id: "coolwarm", label: "Coolwarm" },
  { id: "jet", label: "Jet" },
];

const qualityMetrics: { id: QualityMetric; label: string }[] = [
  { id: "aspectRatio", label: "Aspect Ratio" },
  { id: "minAngle", label: "Min Angle" },
  { id: "maxAngle", label: "Max Angle" },
  { id: "edgeLength", label: "Edge Length" },
  { id: "area", label: "Area" },
];

interface ViewControlsProps {
  show3DControls?: boolean;
}

export function ViewControls({ show3DControls = true }: ViewControlsProps) {
  const { viewerOptions, setViewerOption } = useMeshStore();

  return (
    <div className="panel">
      <h2 className="panel-header">View Options</h2>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={viewerOptions.showWireframe}
            onChange={(e) => setViewerOption("showWireframe", e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Show wireframe</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={viewerOptions.showVertices}
            onChange={(e) => setViewerOption("showVertices", e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Show vertices</span>
        </label>

        {show3DControls && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={viewerOptions.showFaces}
              onChange={(e) => setViewerOption("showFaces", e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Show faces</span>
          </label>
        )}
      </div>

      {show3DControls && (
        <>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="input-label">Quality Metric</label>
            <select
              value={viewerOptions.qualityMetric ?? ""}
              onChange={(e) =>
                setViewerOption(
                  "qualityMetric",
                  e.target.value ? (e.target.value as QualityMetric) : null
                )
              }
              className="w-full rounded-md border-gray-300 shadow-sm text-sm"
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
                className="w-full rounded-md border-gray-300 shadow-sm text-sm"
              >
                {colormaps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </div>
  );
}
