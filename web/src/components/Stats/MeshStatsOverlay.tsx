import type { MeshStats, MeshType } from "@/types/mesh";

interface MeshStatsOverlayProps {
  meshType: MeshType;
  stats: MeshStats | null;
}

export function MeshStatsOverlay({ meshType, stats }: MeshStatsOverlayProps) {
  if (!stats) return null;

  const items = [
    { label: "V", value: stats.nVertices, title: "Vertices" },
    meshType === "mmg3d" && stats.nTetrahedra > 0
      ? { label: "T", value: stats.nTetrahedra, title: "Tetrahedra" }
      : null,
    stats.nTriangles > 0
      ? { label: "F", value: stats.nTriangles, title: "Triangles" }
      : null,
    meshType !== "mmg3d" && stats.nEdges > 0
      ? { label: "E", value: stats.nEdges, title: "Edges" }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="absolute top-2 right-2 bg-black/60 dark:bg-black/80 text-white text-xs font-mono px-2 py-1 rounded backdrop-blur-sm">
      {items.map((item, i) => (
        <span key={item.label} title={item.title}>
          {i > 0 && <span className="text-gray-400 mx-1">|</span>}
          <span className="text-gray-300">{item.label}:</span>{" "}
          <span className="font-medium">{item.value.toLocaleString()}</span>
        </span>
      ))}
    </div>
  );
}
