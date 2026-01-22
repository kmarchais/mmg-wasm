import { CanvasErrorBoundary } from "@/components/ErrorBoundary";
import { useMeshStore } from "@/stores/meshStore";
import { usePaintStore } from "@/stores/paintStore";
import type { MeshData, MeshType } from "@/types/mesh";
import { getColorArray } from "@/utils/colorMapping";
import {
  buildClippedTetrahedraGeometry,
  buildSurfaceGeometry,
  computeBoundingBox,
  createCenteredPositions,
} from "@/utils/geometryBuilder";
import {
  computeMeshDiagonal,
  createBrushCircle,
  initializeSizeField,
  paintSizeField,
  sizeFieldToColors,
} from "@/utils/paintUtils";
import {
  Environment,
  GizmoHelper,
  GizmoViewport,
  TrackballControls,
} from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface MeshViewer3DProps {
  mesh: MeshData | null;
  meshType: MeshType;
}

interface BrushCursorProps {
  position: THREE.Vector3 | null;
  normal: THREE.Vector3 | null;
  radius: number;
  visible: boolean;
}

function BrushCursor({ position, normal, radius, visible }: BrushCursorProps) {
  const geometry = useMemo(() => {
    if (!position || !normal) return null;
    return createBrushCircle(position, normal, radius);
  }, [position, normal, radius]);

  if (!visible || !geometry) return null;

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color="#ff6600" linewidth={2} depthTest={false} />
    </lineLoop>
  );
}

function MeshGeometry({
  mesh,
  meshType,
  boundingBox,
}: {
  mesh: MeshData;
  meshType: MeshType;
  boundingBox: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    center: THREE.Vector3;
  };
}) {
  const { viewerOptions, theme, clippingEnabled, clippingPosition, meshData } =
    useMeshStore();
  const {
    paintModeEnabled,
    brushSettings,
    sizeFields,
    setSizeField,
    showSizeField,
    isPainting,
    setIsPainting,
  } = usePaintStore();

  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // Brush cursor state
  const [brushPosition, setBrushPosition] = useState<THREE.Vector3 | null>(
    null,
  );
  const [brushNormal, setBrushNormal] = useState<THREE.Vector3 | null>(null);

  // Three.js hooks
  const { camera, gl } = useThree();

  // Raycaster for mesh intersection
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Mesh diagonal for brush calculations
  const meshDiagonal = useMemo(
    () => computeMeshDiagonal(mesh, false),
    [mesh],
  );
  const meshScale = meshData[meshType].scale;
  const brushRadius = brushSettings.radius * meshDiagonal;

  // Check if we have tetrahedra and should show them when clipping
  const hasTetrahedra = mesh.tetrahedra && mesh.tetrahedra.length > 0;
  const showTetrahedraFaces = clippingEnabled && hasTetrahedra;

  // Compute clip threshold in mesh coordinates
  const clipThreshold = useMemo(() => {
    if (!clippingEnabled) return null;
    const size = boundingBox.max.x - boundingBox.min.x;
    // Extend range beyond mesh bounds (20% on each side)
    const extension = 0.2;
    const extendedMin = boundingBox.min.x - size * extension;
    const extendedSize = size * (1 + 2 * extension);
    return extendedMin + extendedSize * clippingPosition;
  }, [clippingEnabled, clippingPosition, boundingBox]);

  const { geometry, wireframeGeometry, pointsGeometry, tetFaceColors } =
    useMemo(() => {
      const nVerts = mesh.vertices.length / 3;
      const nTris = mesh.triangles ? mesh.triangles.length / 3 : 0;

      // Create centered positions array
      const positions = createCenteredPositions(
        mesh.vertices,
        nVerts,
        boundingBox.center,
      );

      // Build geometry based on clipping mode
      if (showTetrahedraFaces && mesh.tetrahedra && clipThreshold !== null) {
        return buildClippedTetrahedraGeometry(
          mesh,
          positions,
          clipThreshold,
          viewerOptions.qualityMetric,
          viewerOptions.colormap,
        );
      }

      // Default: use surface triangles
      return buildSurfaceGeometry(mesh, positions, nTris);
    }, [
      mesh,
      boundingBox,
      showTetrahedraFaces,
      clipThreshold,
      viewerOptions.qualityMetric,
      viewerOptions.colormap,
    ]);

  // Get current size field
  const sizeField = sizeFields[meshType];

  // Compute colors based on quality metric or size field
  const colors = useMemo(() => {
    if (showTetrahedraFaces) return null;
    if (!mesh.triangles) return null;

    const nTris = mesh.triangles.length / 3;

    // Priority: size field visualization > quality metric
    if (showSizeField && sizeField && sizeField.length > 0) {
      return sizeFieldToColors(sizeField, nTris, mesh.triangles);
    }

    if (!viewerOptions.qualityMetric) return null;

    // Only show quality colors for surface meshes (MMGS) where quality is per-triangle
    // For MMG3D, quality is per-tetrahedra so we can't color surface triangles
    if (!mesh.quality || mesh.quality.length === 0) return null;

    // Check if quality count matches triangle count (MMGS case)
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
  }, [
    mesh,
    viewerOptions.qualityMetric,
    viewerOptions.colormap,
    showTetrahedraFaces,
    sizeField,
    showSizeField,
  ]);

  // Set colors on geometry for surface triangles
  useMemo(() => {
    if (showTetrahedraFaces) {
      return;
    }

    if (colors) {
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    } else if (geometry.hasAttribute("color")) {
      geometry.deleteAttribute("color");
    }
  }, [colors, geometry, showTetrahedraFaces]);

  // Convert screen coordinates to mesh hit point
  const getHitPoint = useCallback(
    (event: PointerEvent | MouseEvent): THREE.Vector3 | null => {
      if (!meshRef.current) return null;

      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(meshRef.current);

      if (intersects.length > 0 && intersects[0]) {
        return intersects[0].point.clone().add(boundingBox.center);
      }
      return null;
    },
    [camera, gl.domElement, raycaster, boundingBox.center],
  );

  // Get intersection normal
  const getHitNormal = useCallback(
    (event: PointerEvent | MouseEvent): THREE.Vector3 | null => {
      if (!meshRef.current) return null;

      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(meshRef.current);

      const firstIntersect = intersects[0];
      if (intersects.length > 0 && firstIntersect?.face) {
        return firstIntersect.face.normal.clone();
      }
      return null;
    },
    [camera, gl.domElement, raycaster],
  );

  // Paint at a given point
  const doPaint = useCallback(
    (hitPoint: THREE.Vector3) => {
      // Initialize size field if needed
      let currentField = sizeField;
      if (!currentField) {
        currentField = initializeSizeField(mesh, false, meshScale * 0.1);
      }

      // Paint
      const newField = paintSizeField(
        currentField,
        mesh,
        false,
        hitPoint,
        brushSettings,
        meshDiagonal,
      );

      setSizeField(meshType, newField);
    },
    [
      mesh,
      meshType,
      meshDiagonal,
      meshScale,
      brushSettings,
      sizeField,
      setSizeField,
    ],
  );

  // Handle pointer events for painting
  useEffect(() => {
    if (!paintModeEnabled) return;

    const canvas = gl.domElement;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return; // Left click only
      event.preventDefault();
      setIsPainting(true);

      const hitPoint = getHitPoint(event);
      if (hitPoint) {
        doPaint(hitPoint);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      // Update brush cursor
      const hitPoint = getHitPoint(event);
      const hitNormal = getHitNormal(event);

      if (hitPoint) {
        // Transform to centered coordinates for visualization
        setBrushPosition(hitPoint.clone().sub(boundingBox.center));
        setBrushNormal(hitNormal);
      } else {
        setBrushPosition(null);
        setBrushNormal(null);
      }

      // Paint if dragging
      if (isPainting && hitPoint) {
        doPaint(hitPoint);
      }
    };

    const handlePointerUp = () => {
      setIsPainting(false);
    };

    const handlePointerLeave = () => {
      setBrushPosition(null);
      setBrushNormal(null);
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
  }, [
    paintModeEnabled,
    isPainting,
    gl.domElement,
    getHitPoint,
    getHitNormal,
    doPaint,
    setIsPainting,
    boundingBox.center,
  ]);

  // Clear brush cursor when paint mode is disabled
  useEffect(() => {
    if (!paintModeEnabled) {
      setBrushPosition(null);
      setBrushNormal(null);
    }
  }, [paintModeEnabled]);

  const wireframeColor = "#000000";
  const faceColor = theme === "dark" ? "#6b7280" : "#e8f4fd";

  const hasColors = !!(colors || tetFaceColors);

  return (
    <group>
      {viewerOptions.showFaces && (
        <mesh
          ref={meshRef}
          geometry={geometry}
          key={`mesh-${showTetrahedraFaces}-${hasColors}`}
        >
          <meshStandardMaterial
            color={hasColors ? "#ffffff" : faceColor}
            vertexColors={hasColors}
            side={THREE.DoubleSide}
            roughness={0.4}
            metalness={0.8}
            envMapIntensity={1.5}
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
      {/* Brush cursor */}
      <BrushCursor
        position={brushPosition}
        normal={brushNormal}
        radius={brushRadius}
        visible={paintModeEnabled && brushPosition !== null}
      />
    </group>
  );
}

function SceneContent({
  mesh,
  meshType,
  boundingBox,
}: {
  mesh: MeshData;
  meshType: MeshType;
  boundingBox: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    center: THREE.Vector3;
  };
}) {
  const { paintModeEnabled, isPainting } = usePaintStore();

  return (
    <>
      <Environment preset="studio" background={false} />
      <ambientLight intensity={1.2} />
      <MeshGeometry mesh={mesh} meshType={meshType} boundingBox={boundingBox} />
      <TrackballControls
        makeDefault
        rotateSpeed={3}
        enabled={!paintModeEnabled || !isPainting}
      />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>
    </>
  );
}

export function MeshViewer3D({ mesh, meshType }: MeshViewer3DProps) {
  const { theme } = useMeshStore();
  const { paintModeEnabled } = usePaintStore();
  const backgroundColor = theme === "dark" ? "#1f2937" : "#f8f9fa";

  const boundingBox = useMemo(() => {
    if (!mesh) return null;
    return computeBoundingBox(mesh);
  }, [mesh]);

  return (
    <div
      className="viewer-container h-full"
      style={{ cursor: paintModeEnabled ? "crosshair" : "default" }}
    >
      {mesh && boundingBox ? (
        <CanvasErrorBoundary>
          <Canvas
            camera={{ position: [2, 2, 2], fov: 50 }}
            style={{ background: backgroundColor }}
            gl={{
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.0,
            }}
          >
            <SceneContent
              mesh={mesh}
              meshType={meshType}
              boundingBox={boundingBox}
            />
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
