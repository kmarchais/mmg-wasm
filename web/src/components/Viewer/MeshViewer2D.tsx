import { useEffect, useRef, useMemo } from "react";
import { useMeshStore } from "@/stores/meshStore";
import type { MeshData } from "@/types/mesh";
import { computeTriangleQuality, getMetricRange } from "@/utils/meshQuality";
import { getColor } from "@/utils/colorMapping";

interface MeshViewer2DProps {
  mesh: MeshData | null;
  label: string;
}

export function MeshViewer2D({ mesh, label }: MeshViewer2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewerOptions } = useMeshStore();

  // Compute quality if a metric is selected
  const qualityData = useMemo(() => {
    if (!mesh?.triangles || !viewerOptions.qualityMetric) return null;
    const quality = computeTriangleQuality(
      mesh.vertices,
      mesh.triangles,
      viewerOptions.qualityMetric,
      2
    );
    const range = getMetricRange(quality);
    return { quality, ...range };
  }, [mesh, viewerOptions.qualityMetric]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mesh) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 20;

    // Compute bounding box
    const vertices = mesh.vertices;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (let i = 0; i < vertices.length; i += 2) {
      const x = vertices[i]!;
      const y = vertices[i + 1]!;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const meshWidth = maxX - minX || 1;
    const meshHeight = maxY - minY || 1;
    const scale = Math.min(
      (width - 2 * padding) / meshWidth,
      (height - 2 * padding) / meshHeight
    );

    const offsetX =
      padding + ((width - 2 * padding) - meshWidth * scale) / 2 - minX * scale;
    const offsetY =
      padding +
      ((height - 2 * padding) - meshHeight * scale) / 2 -
      minY * scale;

    const transformX = (x: number) => offsetX + x * scale;
    const transformY = (y: number) => height - (offsetY + y * scale);

    // Clear canvas
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, width, height);

    const triangles = mesh.triangles;
    if (triangles) {
      const nTris = triangles.length / 3;

      // Draw filled triangles if quality metric is selected
      if (qualityData && viewerOptions.qualityMetric) {
        for (let i = 0; i < nTris; i++) {
          const v0 = (triangles[i * 3]! - 1) * 2;
          const v1 = (triangles[i * 3 + 1]! - 1) * 2;
          const v2 = (triangles[i * 3 + 2]! - 1) * 2;

          const color = getColor(
            qualityData.quality[i]!,
            qualityData.min,
            qualityData.max,
            viewerOptions.colormap
          );

          ctx.fillStyle = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
          ctx.beginPath();
          ctx.moveTo(transformX(vertices[v0]!), transformY(vertices[v0 + 1]!));
          ctx.lineTo(transformX(vertices[v1]!), transformY(vertices[v1 + 1]!));
          ctx.lineTo(transformX(vertices[v2]!), transformY(vertices[v2 + 1]!));
          ctx.closePath();
          ctx.fill();
        }
      }

      // Draw wireframe
      if (viewerOptions.showWireframe) {
        ctx.strokeStyle = "#0066cc";
        ctx.lineWidth = 1;

        for (let i = 0; i < nTris; i++) {
          const v0 = (triangles[i * 3]! - 1) * 2;
          const v1 = (triangles[i * 3 + 1]! - 1) * 2;
          const v2 = (triangles[i * 3 + 2]! - 1) * 2;

          ctx.beginPath();
          ctx.moveTo(transformX(vertices[v0]!), transformY(vertices[v0 + 1]!));
          ctx.lineTo(transformX(vertices[v1]!), transformY(vertices[v1 + 1]!));
          ctx.lineTo(transformX(vertices[v2]!), transformY(vertices[v2 + 1]!));
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    // Draw vertices
    if (viewerOptions.showVertices) {
      ctx.fillStyle = "#dc3545";
      const nVerts = vertices.length / 2;
      for (let i = 0; i < nVerts; i++) {
        ctx.beginPath();
        ctx.arc(
          transformX(vertices[i * 2]!),
          transformY(vertices[i * 2 + 1]!),
          2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }, [mesh, viewerOptions, qualityData]);

  return (
    <div className="flex flex-col h-full">
      <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
      <div className="viewer-container flex-1 min-h-[200px]">
        {mesh ? (
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: "block" }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No mesh data
          </div>
        )}
      </div>
    </div>
  );
}
