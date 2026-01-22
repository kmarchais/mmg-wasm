import { useMeshStore } from "@/stores/meshStore";
import { usePaintStore } from "@/stores/paintStore";

interface PaintPanelProps {
  disabled?: boolean;
  onApplyPaint: () => void;
}

export function PaintPanel({ disabled, onApplyPaint }: PaintPanelProps) {
  const { meshData, activeMeshType } = useMeshStore();
  const {
    paintModeEnabled,
    setPaintModeEnabled,
    brushSettings,
    setBrushSettings,
    sizeFields,
    clearSizeField,
    showSizeField,
    setShowSizeField,
  } = usePaintStore();

  const meshScale = meshData[activeMeshType].scale;
  const hasSizeField = sizeFields[activeMeshType] !== null;

  // Scale target size relative to mesh scale
  const minTargetSize = meshScale * 0.005;
  const maxTargetSize = meshScale * 0.5;
  const defaultTargetSize = meshScale * 0.05;

  const handleClear = () => {
    clearSizeField(activeMeshType);
  };

  return (
    <div className="panel">
      <h2 className="panel-header">Paint Refinement</h2>

      {/* Paint mode toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={paintModeEnabled}
            onChange={(e) => setPaintModeEnabled(e.target.checked)}
            disabled={disabled}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Paint Mode
          </span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Click and drag on the mesh to paint refinement regions
        </p>
      </div>

      {/* Brush settings - only show when paint mode is enabled */}
      {paintModeEnabled && (
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Brush radius */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="input-label">Brush Size</label>
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                {(brushSettings.radius * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.01}
              max={0.5}
              step={0.01}
              value={brushSettings.radius}
              onChange={(e) =>
                setBrushSettings({ radius: Number.parseFloat(e.target.value) })
              }
              disabled={disabled}
              className="slider-track"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Brush radius as percentage of mesh size
            </p>
          </div>

          {/* Target size */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="input-label">Target Edge Size</label>
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                {brushSettings.targetSize.toFixed(4)}
              </span>
            </div>
            <input
              type="range"
              min={minTargetSize}
              max={maxTargetSize}
              step={(maxTargetSize - minTargetSize) / 100}
              value={brushSettings.targetSize}
              onChange={(e) =>
                setBrushSettings({
                  targetSize: Number.parseFloat(e.target.value),
                })
              }
              disabled={disabled}
              className="slider-track"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Smaller = finer mesh, larger = coarser mesh
            </p>
            {/* Quick presets */}
            <div className="flex gap-1 mt-2">
              <button
                type="button"
                onClick={() =>
                  setBrushSettings({ targetSize: minTargetSize * 2 })
                }
                disabled={disabled}
                className="btn btn-secondary text-xs py-1 px-2 flex-1"
              >
                Fine
              </button>
              <button
                type="button"
                onClick={() => setBrushSettings({ targetSize: defaultTargetSize })}
                disabled={disabled}
                className="btn btn-secondary text-xs py-1 px-2 flex-1"
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() =>
                  setBrushSettings({ targetSize: maxTargetSize * 0.5 })
                }
                disabled={disabled}
                className="btn btn-secondary text-xs py-1 px-2 flex-1"
              >
                Coarse
              </button>
            </div>
          </div>

          {/* Falloff */}
          <div className="space-y-1">
            <label className="input-label">Falloff</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBrushSettings({ falloff: "hard" })}
                disabled={disabled}
                className={`btn text-xs py-1 px-3 flex-1 ${
                  brushSettings.falloff === "hard"
                    ? "btn-primary"
                    : "btn-secondary"
                }`}
              >
                Hard
              </button>
              <button
                type="button"
                onClick={() => setBrushSettings({ falloff: "smooth" })}
                disabled={disabled}
                className={`btn text-xs py-1 px-3 flex-1 ${
                  brushSettings.falloff === "smooth"
                    ? "btn-primary"
                    : "btn-secondary"
                }`}
              >
                Smooth
              </button>
            </div>
          </div>

          {/* Strength (only for smooth falloff) */}
          {brushSettings.falloff === "smooth" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="input-label">Blend Strength</label>
                <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                  {(brushSettings.strength * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={brushSettings.strength}
                onChange={(e) =>
                  setBrushSettings({
                    strength: Number.parseFloat(e.target.value),
                  })
                }
                disabled={disabled}
                className="slider-track"
              />
            </div>
          )}
        </div>
      )}

      {/* Show size field toggle */}
      {hasSizeField && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSizeField}
              onChange={(e) => setShowSizeField(e.target.checked)}
              disabled={disabled}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Show size field overlay
            </span>
          </label>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          type="button"
          onClick={onApplyPaint}
          disabled={disabled || !hasSizeField}
          className="btn btn-primary w-full"
        >
          Apply Painted Refinement
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || !hasSizeField}
          className="btn btn-secondary w-full"
        >
          Clear Paint
        </button>
      </div>
    </div>
  );
}
