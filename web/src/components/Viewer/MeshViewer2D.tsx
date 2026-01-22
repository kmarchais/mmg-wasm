import { useMeshStore } from "@/stores/meshStore";
import { usePaintStore } from "@/stores/paintStore";
import type { MeshData, MeshType } from "@/types/mesh";
import { getColor } from "@/utils/colorMapping";
import { getMetricRange } from "@/utils/meshQuality";
import {
  computeMeshDiagonal,
  initializeSizeField,
  paintSizeField,
} from "@/utils/paintUtils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface MeshViewer2DProps {
  mesh: MeshData | null;
  meshType: MeshType;
}

export function MeshViewer2D({ mesh, meshType }: MeshViewer2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewerOptions, theme, meshData } = useMeshStore();
  const {
    paintModeEnabled,
    brushSettings,
    sizeFields,
    setSizeField,
    showSizeField,
    isPainting,
    setIsPainting,
  } = usePaintStore();

  // Store transformation for coordinate mapping
  const [transform, setTransform] = useState<{
    scale: number;
    offsetX: number;
    offsetY: number;
    height: number;
  } | null>(null);

  // Brush position in mesh coordinates
  const [brushPos, setBrushPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Use stored quality from mesh data
  const qualityData = useMemo(() => {
    if (
      !mesh?.quality ||
      mesh.quality.length === 0 ||
      !viewerOptions.qualityMetric
    )
      return null;
    const range = getMetricRange(mesh.quality);
    return { quality: mesh.quality, ...range };
  }, [mesh, viewerOptions.qualityMetric]);

  // Compute size field color data
  const sizeFieldData = useMemo(() => {
    const sizeField = sizeFields[meshType];
    if (!sizeField || sizeField.length === 0 || !showSizeField) return null;

    let minSize = Number.POSITIVE_INFINITY;
    let maxSize = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < sizeField.length; i++) {
      const size = sizeField[i] ?? 0;
      minSize = Math.min(minSize, size);
      maxSize = Math.max(maxSize, size);
    }

    return { sizeField, min: minSize, max: maxSize };
  }, [sizeFields, meshType, showSizeField]);

  // Mesh diagonal for brush calculations
  const meshDiagonal = useMemo(
    () => (mesh ? computeMeshDiagonal(mesh, true) : 1),
    [mesh],
  );
  const meshScale = meshData[meshType].scale;

  // Transform screen coordinates to mesh coordinates
  const screenToMesh = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } | null => {
      if (!transform || !canvasRef.current) return null;

      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = screenX - rect.left;
      const canvasY = screenY - rect.top;

      // Inverse transform
      const meshX = (canvasX - transform.offsetX) / transform.scale;
      const meshY =
        (transform.height - canvasY - transform.offsetY) / transform.scale;

      return { x: meshX, y: meshY };
    },
    [transform],
  );

  // Paint at a point
  const doPaint = useCallback(
    (meshCoords: { x: number; y: number }) => {
      if (!mesh) return;

      // Initialize size field if needed
      let currentField = sizeFields[meshType];
      if (!currentField) {
        currentField = initializeSizeField(mesh, true, meshScale * 0.1);
      }

      // Paint
      const newField = paintSizeField(
        currentField,
        mesh,
        true,
        meshCoords,
        brushSettings,
        meshDiagonal,
      );

      setSizeField(meshType, newField);
    },
    [mesh, meshType, meshDiagonal, meshScale, brushSettings, sizeFields, setSizeField],
  );

  // Handle pointer events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !paintModeEnabled) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return; // Left click only
      event.preventDefault();
      setIsPainting(true);

      const meshCoords = screenToMesh(event.clientX, event.clientY);
      if (meshCoords) {
        doPaint(meshCoords);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const meshCoords = screenToMesh(event.clientX, event.clientY);
      setBrushPos(meshCoords);

      // Paint if dragging
      if (isPainting && meshCoords) {
        doPaint(meshCoords);
      }
    };

    const handlePointerUp = () => {
      setIsPainting(false);
    };

    const handlePointerLeave = () => {
      setBrushPos(null);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [paintModeEnabled, isPainting, screenToMesh, doPaint, setIsPainting]);

  // Clear brush when paint mode disabled
  useEffect(() => {
    if (!paintModeEnabled) {
      setBrushPos(null);
    }
  }, [paintModeEnabled]);

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
    let minX = Number.POSITIVE_INFINITY,
      minY = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY,
      maxY = Number.NEGATIVE_INFINITY;
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
      (height - 2 * padding) / meshHeight,
    );

    const offsetX =
      padding + (width - 2 * padding - meshWidth * scale) / 2 - minX * scale;
    const offsetY =
      padding + (height - 2 * padding - meshHeight * scale) / 2 - minY * scale;

    // Store transform for painting
    setTransform({ scale, offsetX, offsetY, height });

    const transformX = (x: number) => offsetX + x * scale;
    const transformY = (y: number) => height - (offsetY + y * scale);

    // Clear canvas with theme-appropriate background
    ctx.fillStyle = theme === "dark" ? "#1f2937" : "#f8f9fa";
    ctx.fillRect(0, 0, width, height);

    const triangles = mesh.triangles;
    if (triangles) {
      const nTris = triangles.length / 3;

      // Draw filled triangles based on size field or quality metric
      if (sizeFieldData && showSizeField) {
        // Size field visualization
        const { sizeField, min, max } = sizeFieldData;
        const range = max - min || 1;

        for (let i = 0; i < nTris; i++) {
          const v0Idx = triangles[i * 3]! - 1;
          const v1Idx = triangles[i * 3 + 1]! - 1;
          const v2Idx = triangles[i * 3 + 2]! - 1;

          // Average size at triangle corners
          const s0 = sizeField[v0Idx] ?? 0;
          const s1 = sizeField[v1Idx] ?? 0;
          const s2 = sizeField[v2Idx] ?? 0;
          const avgSize = (s0 + s1 + s2) / 3;
          const t = (avgSize - min) / range;

          // Blue (fine) to Red (coarse) color mapping
          let r: number, g: number, b: number;
          if (t < 0.5) {
            const s = t * 2;
            r = s;
            g = s;
            b = 1;
          } else {
            const s = (t - 0.5) * 2;
            r = 1;
            g = 1 - s;
            b = 1 - s;
          }

          const v0 = v0Idx * 2;
          const v1 = v1Idx * 2;
          const v2 = v2Idx * 2;

          ctx.fillStyle = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
          ctx.beginPath();
          ctx.moveTo(transformX(vertices[v0]!), transformY(vertices[v0 + 1]!));
          ctx.lineTo(transformX(vertices[v1]!), transformY(vertices[v1 + 1]!));
          ctx.lineTo(transformX(vertices[v2]!), transformY(vertices[v2 + 1]!));
          ctx.closePath();
          ctx.fill();
        }
      } else if (qualityData && viewerOptions.qualityMetric) {
        // Quality metric visualization
        for (let i = 0; i < nTris; i++) {
          const v0 = (triangles[i * 3]! - 1) * 2;
          const v1 = (triangles[i * 3 + 1]! - 1) * 2;
          const v2 = (triangles[i * 3 + 2]! - 1) * 2;

          const color = getColor(
            qualityData.quality[i]!,
            qualityData.min,
            qualityData.max,
            viewerOptions.colormap,
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
        ctx.strokeStyle = theme === "dark" ? "#a0a0a0" : "#000000";
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
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    // Draw brush cursor
    if (paintModeEnabled && brushPos) {
      const brushRadius = brushSettings.radius * meshDiagonal;
      const screenRadius = brushRadius * scale;

      ctx.strokeStyle = "#ff6600";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        transformX(brushPos.x),
        transformY(brushPos.y),
        screenRadius,
        0,
        Math.PI * 2,
      );
      ctx.stroke();

      // Draw crosshair
      ctx.beginPath();
      ctx.moveTo(transformX(brushPos.x) - 5, transformY(brushPos.y));
      ctx.lineTo(transformX(brushPos.x) + 5, transformY(brushPos.y));
      ctx.moveTo(transformX(brushPos.x), transformY(brushPos.y) - 5);
      ctx.lineTo(transformX(brushPos.x), transformY(brushPos.y) + 5);
      ctx.stroke();
    }
  }, [
    mesh,
    viewerOptions,
    qualityData,
    theme,
    sizeFieldData,
    showSizeField,
    paintModeEnabled,
    brushPos,
    brushSettings.radius,
    meshDiagonal,
  ]);

  return (
    <div
      className="viewer-container h-full"
      style={{ cursor: paintModeEnabled ? "crosshair" : "default" }}
    >
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
  );
}
