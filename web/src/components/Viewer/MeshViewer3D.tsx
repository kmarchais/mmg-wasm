import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { useMeshStore } from "@/stores/meshStore";
import type { MeshData } from "@/types/mesh";
import { getColorArray } from "@/utils/colorMapping";
import {
  createCenteredPositions,
  buildClippedTetrahedraGeometry,
  buildSurfaceGeometry,
  computeBoundingBox,
} from "@/utils/geometryBuilder";
import { CanvasErrorBoundary } from "@/components/ErrorBoundary";

interface MeshViewer3DProps {
  mesh: MeshData | null;
}

function MeshGeometry({ mesh, boundingBox }: { mesh: MeshData; boundingBox: { min: THREE.Vector3; max: THREE.Vector3; center: THREE.Vector3 } }) {
  const { viewerOptions, theme, clippingEnabled, clippingPosition } = useMeshStore();
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // Check if we have tetrahedra and should show them when clipping
  const hasTetrahedra = mesh.tetrahedra && mesh.tetrahedra.length > 0;
  const showTetrahedraFaces = clippingEnabled && hasTetrahedra;

  // Compute clip threshold in mesh coordinates
  const clipThreshold = useMemo(() => {
    if (!clippingEnabled) return null;
    const size = boundingBox.max.x - boundingBox.min.x;
    // Add margin to avoid artifacts at boundaries
    const margin = 0.02;
    const adjustedPosition = margin + clippingPosition * (1 - 2 * margin);
    return boundingBox.min.x + size * adjustedPosition;
  }, [clippingEnabled, clippingPosition, boundingBox]);

  const { geometry, wireframeGeometry, pointsGeometry, tetFaceColors } = useMemo(() => {
    const nVerts = mesh.vertices.length / 3;
    const nTris = mesh.triangles ? mesh.triangles.length / 3 : 0;

    // Create centered positions array
    const positions = createCenteredPositions(mesh.vertices, nVerts, boundingBox.center);

    // Build geometry based on clipping mode
    if (showTetrahedraFaces && mesh.tetrahedra && clipThreshold !== null) {
      return buildClippedTetrahedraGeometry(
        mesh,
        positions,
        clipThreshold,
        viewerOptions.qualityMetric,
        viewerOptions.colormap
      );
    }

    // Default: use surface triangles
    return buildSurfaceGeometry(mesh, positions, nTris);
  }, [mesh, boundingBox, showTetrahedraFaces, clipThreshold, viewerOptions.qualityMetric, viewerOptions.colormap]);

  // Compute quality colors for surface triangles
  // For MMGS meshes, use stored triangle quality
  // For MMG3D meshes without tetrahedra, use stored quality if available
  const colors = useMemo(() => {
    if (showTetrahedraFaces) return null;
    if (!viewerOptions.qualityMetric || !mesh.triangles) return null;

    // Only show quality colors for surface meshes (MMGS) where quality is per-triangle
    // For MMG3D, quality is per-tetrahedra so we can't color surface triangles
    if (!mesh.quality || mesh.quality.length === 0) return null;

    // Check if quality count matches triangle count (MMGS case)
    const nTris = mesh.triangles.length / 3;
    if (mesh.quality.length !== nTris) return null;

    const faceColors = getColorArray(mesh.quality, viewerOptions.colormap);

    const vertexColors = new Float32Array(nTris * 3 * 3);
    for (let i = 0; i < nTris; i++) {
      const r = faceColors[i * 3] ?? 0;
      const g = faceColors[i * 3 + 1] ?? 0;
      const b = faceColors[i * 3 + 2] ?? 0;
      for (let j = 0; j < 3; j++) {
        vertexColors[(i * 3 + j) * 3] = r;
        vertexColors[(i * 3 + j) * 3 + 1] = g;
        vertexColors[(i * 3 + j) * 3 + 2] = b;
      }
    }

    return vertexColors;
  }, [mesh, viewerOptions.qualityMetric, viewerOptions.colormap, showTetrahedraFaces]);

  // Set colors on geometry for surface triangles (MMGS/MMG2D with quality)
  useMemo(() => {
    // For clipped tetrahedra view, colors are already set in the geometry useMemo
    if (showTetrahedraFaces) {
      return;
    }

    if (colors) {
      // Geometry is already non-indexed, just add the color attribute
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    } else if (geometry.hasAttribute("color")) {
      geometry.deleteAttribute("color");
    }
  }, [colors, geometry, showTetrahedraFaces]);

  const wireframeColor = "#000000";
  const faceColor = theme === "dark" ? "#6b7280" : "#e8f4fd";

  const hasColors = !!(colors || tetFaceColors);

  return (
    <group>
      {viewerOptions.showFaces && (
        <mesh ref={meshRef} geometry={geometry} key={`mesh-${showTetrahedraFaces}-${hasColors}`}>
          <meshStandardMaterial
            color={hasColors ? "#ffffff" : faceColor}
            vertexColors={hasColors}
            side={THREE.DoubleSide}
            flatShading
          />
        </mesh>
      )}
      {viewerOptions.showWireframe && (
        <lineSegments ref={wireframeRef} geometry={wireframeGeometry}>
          <lineBasicMaterial color={wireframeColor} linewidth={1} />
        </lineSegments>
      )}
      {viewerOptions.showVertices && (
        <points ref={pointsRef} geometry={pointsGeometry}>
          <pointsMaterial color="#dc3545" size={0.02} sizeAttenuation />
        </points>
      )}
    </group>
  );
}

export function MeshViewer3D({ mesh }: MeshViewer3DProps) {
  const { theme } = useMeshStore();
  const backgroundColor = theme === "dark" ? "#1f2937" : "#f8f9fa";

  const boundingBox = useMemo(() => {
    if (!mesh) return null;
    return computeBoundingBox(mesh);
  }, [mesh]);

  return (
    <div className="viewer-container h-full">
      {mesh && boundingBox ? (
        <CanvasErrorBoundary>
          <Canvas
            camera={{ position: [2, 2, 2], fov: 50 }}
            style={{ background: backgroundColor }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <directionalLight position={[-5, -5, -5]} intensity={0.3} />
            <MeshGeometry mesh={mesh} boundingBox={boundingBox} />
            <OrbitControls makeDefault />
            <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
              <GizmoViewport labelColor="white" axisHeadScale={1} />
            </GizmoHelper>
          </Canvas>
        </CanvasErrorBoundary>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          No mesh data
        </div>
      )}
    </div>
  );
}
