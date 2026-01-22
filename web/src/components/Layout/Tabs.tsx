import { useMeshStore } from "@/stores/meshStore";
import type { MeshType } from "@/types/mesh";

const tabs: { id: MeshType; label: string; description: string }[] = [
  { id: "mmg2d", label: "2D (MMG2D)", description: "2D triangular mesh" },
  { id: "mmgs", label: "Surface (MMGS)", description: "3D surface mesh" },
  { id: "mmg3d", label: "3D (MMG3D)", description: "3D tetrahedral mesh" },
];

export function Tabs() {
  const { activeMeshType, setActiveMeshType } = useMeshStore();

  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="flex gap-1 px-6" aria-label="Mesh type tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMeshType(tab.id)}
            className={`tab-button ${activeMeshType === tab.id ? "active" : ""}`}
            aria-selected={activeMeshType === tab.id}
            role="tab"
          >
            <span className="block">{tab.label}</span>
            <span className="block text-xs font-normal opacity-70">
              {tab.description}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
