import type { MeshStats, MeshType } from "@/types/mesh";

interface StatsComparisonProps {
  meshType: MeshType;
  statsBefore: MeshStats | null;
  statsAfter: MeshStats | null;
}

function formatChange(before: number, after: number): string {
  if (before === 0) return "-";
  const change = ((after - before) / before) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(0)}%`;
}

function getChangeClass(before: number, after: number): string {
  if (before === after) return "text-gray-500 dark:text-gray-400";
  return after > before
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

export function StatsComparison({
  meshType,
  statsBefore,
  statsAfter,
}: StatsComparisonProps) {
  if (!statsBefore) return null;

  const rows = [
    {
      label: "Vertices",
      before: statsBefore.nVertices,
      after: statsAfter?.nVertices ?? null,
    },
  ];

  if (meshType === "mmg3d" && statsBefore.nTetrahedra > 0) {
    rows.push({
      label: "Tetrahedra",
      before: statsBefore.nTetrahedra,
      after: statsAfter?.nTetrahedra ?? null,
    });
  }

  if (statsBefore.nTriangles > 0) {
    rows.push({
      label: "Triangles",
      before: statsBefore.nTriangles,
      after: statsAfter?.nTriangles ?? null,
    });
  }

  if (meshType !== "mmg3d" && statsBefore.nEdges > 0) {
    rows.push({
      label: "Edges",
      before: statsBefore.nEdges,
      after: statsAfter?.nEdges ?? null,
    });
  }

  return (
    <div className="panel">
      <h2 className="panel-header">Statistics</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 dark:text-gray-400 text-xs">
            <th className="text-left py-1 font-medium">Metric</th>
            <th className="text-right py-1 font-medium">Before</th>
            <th className="text-right py-1 font-medium">After</th>
            <th className="text-right py-1 font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="border-t border-gray-100 dark:border-gray-800"
            >
              <td className="py-1.5 text-gray-700 dark:text-gray-300">
                {row.label}
              </td>
              <td className="py-1.5 text-right font-mono text-gray-600 dark:text-gray-400">
                {row.before.toLocaleString()}
              </td>
              <td className="py-1.5 text-right font-mono text-gray-900 dark:text-gray-100">
                {row.after !== null ? row.after.toLocaleString() : "-"}
              </td>
              <td
                className={`py-1.5 text-right font-mono text-xs ${
                  row.after !== null
                    ? getChangeClass(row.before, row.after)
                    : "text-gray-400"
                }`}
              >
                {row.after !== null ? formatChange(row.before, row.after) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
