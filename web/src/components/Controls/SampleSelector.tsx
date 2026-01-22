import {
  type SampleMesh,
  samples2D,
  samples3D,
  samplesSurface,
} from "@/fixtures/defaultMeshes";
import type { MeshType } from "@/types/mesh";

const samplesByType: Record<MeshType, SampleMesh[]> = {
  mmg2d: samples2D,
  mmgs: samplesSurface,
  mmg3d: samples3D,
};

interface SampleSelectorProps {
  meshType: MeshType;
  onSelect: (mesh: SampleMesh) => void;
  disabled?: boolean;
}

export function SampleSelector({
  meshType,
  onSelect,
  disabled,
}: SampleSelectorProps) {
  const samples = samplesByType[meshType];

  return (
    <div className="panel">
      <h2 className="panel-header">Sample Meshes</h2>
      <div className="grid grid-cols-1 gap-2">
        {samples.map((sample) => (
          <button
            type="button"
            key={sample.name}
            onClick={() => onSelect(sample)}
            disabled={disabled}
            className="btn btn-secondary text-left py-2 px-3"
          >
            <span className="font-medium">{sample.name}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 block">
              {sample.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
