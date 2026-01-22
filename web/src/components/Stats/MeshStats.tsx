import type { MeshStats as MeshStatsType, MeshType } from "@/types/mesh";

interface MeshStatsProps {
  meshType: MeshType;
  statsBefore: MeshStatsType | null;
  statsAfter: MeshStatsType | null;
}

export function MeshStats({
  meshType,
  statsBefore,
  statsAfter,
}: MeshStatsProps) {
  const formatValue = (value: number | undefined | null): string => {
    return value !== undefined && value !== null ? value.toLocaleString() : "-";
  };

  const getChange = (
    before: number | undefined | null,
    after: number | undefined | null
  ): { value: string; className: string } | null => {
    if (before === undefined || before === null || after === undefined || after === null) {
      return null;
    }
    if (before === 0) return null;

    const change = ((after - before) / before) * 100;
    const sign = change > 0 ? "+" : "";
    return {
      value: `${sign}${change.toFixed(1)}%`,
      className: change > 0 ? "text-red-600" : change < 0 ? "text-green-600" : "text-gray-500",
    };
  };

  const rows = [
    {
      label: "Vertices",
      before: statsBefore?.nVertices,
      after: statsAfter?.nVertices,
    },
    meshType === "mmg3d"
      ? {
          label: "Tetrahedra",
          before: statsBefore?.nTetrahedra,
          after: statsAfter?.nTetrahedra,
        }
      : null,
    {
      label: "Triangles",
      before: statsBefore?.nTriangles,
      after: statsAfter?.nTriangles,
    },
    meshType !== "mmg3d"
      ? {
          label: "Edges",
          before: statsBefore?.nEdges,
          after: statsAfter?.nEdges,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className="panel">
      <h2 className="panel-header">Mesh Statistics</h2>
      <table className="stats-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th className="text-right">Before</th>
            <th className="text-right">After</th>
            <th className="text-right">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const change = getChange(row.before, row.after);
            return (
              <tr key={row.label}>
                <td className="font-medium">{row.label}</td>
                <td className="text-right font-mono">
                  {formatValue(row.before)}
                </td>
                <td className="text-right font-mono">
                  {formatValue(row.after)}
                </td>
                <td className={`text-right font-mono text-sm ${change?.className ?? ""}`}>
                  {change?.value ?? "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
