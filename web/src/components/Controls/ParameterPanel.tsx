import { useMeshStore } from "@/stores/meshStore";
import type { MeshType, RemeshParams } from "@/types/mesh";

interface ParameterConfig {
  key: keyof RemeshParams;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  default?: number;
}

const parameterConfigs: Record<MeshType, ParameterConfig[]> = {
  mmg2d: [
    {
      key: "hmax",
      label: "hmax",
      description: "Maximum edge length",
      min: 0.01,
      max: 1.0,
      step: 0.01,
      default: 0.15,
    },
    {
      key: "hmin",
      label: "hmin",
      description: "Minimum edge length",
      min: 0.001,
      max: 0.5,
      step: 0.001,
    },
    {
      key: "hsiz",
      label: "hsiz",
      description: "Constant edge length",
      min: 0.01,
      max: 1.0,
      step: 0.01,
    },
    {
      key: "hausd",
      label: "hausd",
      description: "Hausdorff distance",
      min: 0.001,
      max: 0.5,
      step: 0.001,
    },
    {
      key: "hgrad",
      label: "hgrad",
      description: "Gradation parameter",
      min: 1.0,
      max: 3.0,
      step: 0.1,
    },
  ],
  mmgs: [
    {
      key: "hmax",
      label: "hmax",
      description: "Maximum edge length",
      min: 0.05,
      max: 1.0,
      step: 0.01,
      default: 0.25,
    },
    {
      key: "hmin",
      label: "hmin",
      description: "Minimum edge length",
      min: 0.001,
      max: 0.5,
      step: 0.001,
    },
    {
      key: "hsiz",
      label: "hsiz",
      description: "Constant edge length",
      min: 0.01,
      max: 1.0,
      step: 0.01,
    },
    {
      key: "hausd",
      label: "hausd",
      description: "Hausdorff distance",
      min: 0.001,
      max: 0.5,
      step: 0.001,
    },
    {
      key: "hgrad",
      label: "hgrad",
      description: "Gradation parameter",
      min: 1.0,
      max: 3.0,
      step: 0.1,
    },
  ],
  mmg3d: [
    {
      key: "hmax",
      label: "hmax",
      description: "Maximum edge length",
      min: 0.05,
      max: 2.0,
      step: 0.05,
      default: 0.3,
    },
    {
      key: "hmin",
      label: "hmin",
      description: "Minimum edge length",
      min: 0.001,
      max: 0.5,
      step: 0.001,
    },
    {
      key: "hsiz",
      label: "hsiz",
      description: "Constant edge length",
      min: 0.01,
      max: 1.0,
      step: 0.01,
    },
    {
      key: "hausd",
      label: "hausd",
      description: "Hausdorff distance",
      min: 0.001,
      max: 0.5,
      step: 0.001,
    },
    {
      key: "hgrad",
      label: "hgrad",
      description: "Gradation parameter",
      min: 1.0,
      max: 3.0,
      step: 0.1,
    },
  ],
};

interface ParameterPanelProps {
  meshType: MeshType;
  onRemesh: () => void;
  disabled?: boolean;
}

export function ParameterPanel({
  meshType,
  onRemesh,
  disabled,
}: ParameterPanelProps) {
  const { params, setParams, liveRemesh, setLiveRemesh } = useMeshStore();
  const currentParams = params[meshType];
  const configs = parameterConfigs[meshType];

  const handleParamChange = (key: keyof RemeshParams, value: number | undefined) => {
    setParams(meshType, { [key]: value });
  };

  return (
    <div className="panel">
      <h2 className="panel-header">Remeshing Parameters</h2>

      <div className="space-y-4">
        {configs.map((config) => {
          const value = currentParams[config.key];
          const isActive = value !== undefined;

          return (
            <div key={config.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="input-label flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleParamChange(config.key, config.default ?? config.min);
                      } else {
                        handleParamChange(config.key, undefined);
                      }
                    }}
                    className="rounded border-gray-300"
                    disabled={disabled}
                  />
                  <span className="font-mono">{config.label}</span>
                </label>
                {isActive && (
                  <span className="text-sm font-mono text-gray-600">
                    {value?.toFixed(3)}
                  </span>
                )}
              </div>
              {isActive && (
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  value={value ?? config.default ?? config.min}
                  onChange={(e) =>
                    handleParamChange(config.key, parseFloat(e.target.value))
                  }
                  className="slider-track"
                  disabled={disabled}
                />
              )}
              <p className="text-xs text-gray-500">{config.description}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={liveRemesh}
            onChange={(e) => setLiveRemesh(e.target.checked)}
            className="rounded border-gray-300"
            disabled={disabled}
          />
          <span className="text-sm text-gray-700">
            Live remesh (update while dragging)
          </span>
        </label>
      </div>

      <button
        onClick={onRemesh}
        disabled={disabled}
        className="btn btn-primary w-full mt-4"
      >
        Remesh
      </button>
    </div>
  );
}
