import { useMeshStore } from "@/stores/meshStore";
import type { MeshType, RemeshParams } from "@/types/mesh";

interface ParameterConfig {
  key: keyof RemeshParams;
  label: string;
  description: string;
  // These are relative to mesh scale (multipliers)
  minRatio: number;
  maxRatio: number;
  defaultRatio: number;
  // hgrad is absolute, not relative to scale
  absolute?: boolean;
  absoluteMin?: number;
  absoluteMax?: number;
  absoluteDefault?: number;
}

const parameterConfigs: Record<MeshType, ParameterConfig[]> = {
  mmg2d: [
    {
      key: "hmax",
      label: "hmax",
      description: "Maximum edge length",
      minRatio: 0.01,
      maxRatio: 0.5,
      defaultRatio: 0.1,
    },
    {
      key: "hmin",
      label: "hmin",
      description: "Minimum edge length",
      minRatio: 0.001,
      maxRatio: 0.2,
      defaultRatio: 0.01,
    },
    {
      key: "hsiz",
      label: "hsiz",
      description: "Constant edge length",
      minRatio: 0.01,
      maxRatio: 0.5,
      defaultRatio: 0.1,
    },
    {
      key: "hausd",
      label: "hausd",
      description: "Hausdorff distance",
      minRatio: 0.001,
      maxRatio: 0.2,
      defaultRatio: 0.01,
    },
    {
      key: "hgrad",
      label: "hgrad",
      description: "Gradation parameter",
      minRatio: 0,
      maxRatio: 0,
      defaultRatio: 0,
      absolute: true,
      absoluteMin: 1.0,
      absoluteMax: 3.0,
      absoluteDefault: 1.3,
    },
  ],
  mmgs: [
    {
      key: "hmax",
      label: "hmax",
      description: "Maximum edge length",
      minRatio: 0.01,
      maxRatio: 0.5,
      defaultRatio: 0.15,
    },
    {
      key: "hmin",
      label: "hmin",
      description: "Minimum edge length",
      minRatio: 0.001,
      maxRatio: 0.2,
      defaultRatio: 0.01,
    },
    {
      key: "hsiz",
      label: "hsiz",
      description: "Constant edge length",
      minRatio: 0.01,
      maxRatio: 0.5,
      defaultRatio: 0.1,
    },
    {
      key: "hausd",
      label: "hausd",
      description: "Hausdorff distance",
      minRatio: 0.001,
      maxRatio: 0.2,
      defaultRatio: 0.01,
    },
    {
      key: "hgrad",
      label: "hgrad",
      description: "Gradation parameter",
      minRatio: 0,
      maxRatio: 0,
      defaultRatio: 0,
      absolute: true,
      absoluteMin: 1.0,
      absoluteMax: 3.0,
      absoluteDefault: 1.3,
    },
  ],
  mmg3d: [
    {
      key: "hmax",
      label: "hmax",
      description: "Maximum edge length",
      minRatio: 0.01,
      maxRatio: 0.5,
      defaultRatio: 0.2,
    },
    {
      key: "hmin",
      label: "hmin",
      description: "Minimum edge length",
      minRatio: 0.001,
      maxRatio: 0.2,
      defaultRatio: 0.01,
    },
    {
      key: "hsiz",
      label: "hsiz",
      description: "Constant edge length",
      minRatio: 0.01,
      maxRatio: 0.5,
      defaultRatio: 0.1,
    },
    {
      key: "hausd",
      label: "hausd",
      description: "Hausdorff distance",
      minRatio: 0.001,
      maxRatio: 0.2,
      defaultRatio: 0.01,
    },
    {
      key: "hgrad",
      label: "hgrad",
      description: "Gradation parameter",
      minRatio: 0,
      maxRatio: 0,
      defaultRatio: 0,
      absolute: true,
      absoluteMin: 1.0,
      absoluteMax: 3.0,
      absoluteDefault: 1.3,
    },
  ],
};

function getScaledConfig(config: ParameterConfig, scale: number) {
  if (config.absolute) {
    return {
      min: config.absoluteMin!,
      max: config.absoluteMax!,
      default: config.absoluteDefault!,
      step: 0.1,
    };
  }
  const min = config.minRatio * scale;
  const max = config.maxRatio * scale;
  const defaultVal = config.defaultRatio * scale;
  // Compute a sensible step based on the range
  const range = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(range / 100)));
  return { min, max, default: defaultVal, step };
}

interface Preset {
  name: string;
  description: string;
  getParams: (scale: number) => Partial<RemeshParams>;
}

const presets: Preset[] = [
  {
    name: "Fine",
    description: "Small elements, high detail",
    getParams: (scale) => ({
      hmax: scale * 0.05,
      hausd: scale * 0.001,
      hgrad: 1.1,
    }),
  },
  {
    name: "Default",
    description: "Balanced settings",
    getParams: (scale) => ({
      hmax: scale * 0.1,
      hausd: scale * 0.01,
      hgrad: 1.3,
    }),
  },
  {
    name: "Coarse",
    description: "Large elements, fast",
    getParams: (scale) => ({
      hmax: scale * 0.3,
      hausd: scale * 0.05,
      hgrad: 1.5,
    }),
  },
  {
    name: "Optimize",
    description: "Quality only, no size change",
    getParams: () => ({
      hmax: undefined,
      hmin: undefined,
      hsiz: undefined,
      hausd: undefined,
      hgrad: 1.3,
    }),
  },
];

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
  const { params, setParams, liveRemesh, setLiveRemesh, meshData } =
    useMeshStore();
  const currentParams = params[meshType];
  const configs = parameterConfigs[meshType];
  const meshScale = meshData[meshType].scale;

  const handleParamChange = (
    key: keyof RemeshParams,
    value: number | undefined,
  ) => {
    setParams(meshType, { [key]: value });
  };

  const applyPreset = (preset: Preset) => {
    const presetParams = preset.getParams(meshScale);
    // Reset all params first, then apply preset
    setParams(meshType, {
      hmax: undefined,
      hmin: undefined,
      hsiz: undefined,
      hausd: undefined,
      hgrad: undefined,
      ...presetParams,
    });
  };

  return (
    <div className="panel">
      <h2 className="panel-header">Remeshing Parameters</h2>

      {/* Preset buttons */}
      <div className="grid grid-cols-4 gap-1 mb-4">
        {presets.map((preset) => (
          <button
            type="button"
            key={preset.name}
            onClick={() => applyPreset(preset)}
            disabled={disabled}
            className="btn btn-secondary text-xs py-1 px-2"
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {configs.map((config) => {
          const value = currentParams[config.key];
          const isActive = value !== undefined;
          const scaled = getScaledConfig(config, meshScale);

          return (
            <div key={config.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="input-label flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleParamChange(config.key, scaled.default);
                      } else {
                        handleParamChange(config.key, undefined);
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600"
                    disabled={disabled}
                  />
                  <span className="font-mono">{config.label}</span>
                </label>
                {isActive && (
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {value?.toFixed(3)}
                  </span>
                )}
              </div>
              {isActive && (
                <input
                  type="range"
                  min={scaled.min}
                  max={scaled.max}
                  step={scaled.step}
                  value={value ?? scaled.default}
                  onChange={(e) =>
                    handleParamChange(
                      config.key,
                      Number.parseFloat(e.target.value),
                    )
                  }
                  className="slider-track"
                  disabled={disabled}
                />
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {config.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={liveRemesh}
            onChange={(e) => setLiveRemesh(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
            disabled={disabled}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
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
