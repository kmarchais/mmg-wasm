import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { useMeshStore } from "@/stores/meshStore";
import type { MeshData } from "@/types/mesh";
import { getMetricRange } from "@/utils/meshQuality";
import { getColorArray, getColor } from "@/utils/colorMapping";

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
    const vertices = mesh.vertices;
    const triangles = mesh.triangles;
    const tetrahedra = mesh.tetrahedra;
    const nVerts = vertices.length / 3;
    const nTris = triangles ? triangles.length / 3 : 0;
    const nTets = tetrahedra ? tetrahedra.length / 4 : 0;

    const { center } = boundingBox;

    // Create positions array (centered)
    const positions = new Float32Array(nVerts * 3);
    for (let i = 0; i < nVerts; i++) {
      positions[i * 3] = vertices[i * 3]! - center.x;
      positions[i * 3 + 1] = vertices[i * 3 + 1]! - center.y;
      positions[i * 3 + 2] = vertices[i * 3 + 2]! - center.z;
    }

    // Create indexed geometry for faces
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // When clipping with tetrahedra, filter tetrahedra by centroid position
    if (showTetrahedraFaces && tetrahedra && nTets > 0 && clipThreshold !== null) {
      // Filter tetrahedra: only include those whose centroid is below the clip threshold
      // Store both vertex indices and original tetrahedron index for quality mapping
      const visibleTetIndices: number[][] = [];
      const visibleTetOriginalIndices: number[] = [];

      for (let i = 0; i < nTets; i++) {
        const v0Idx = tetrahedra[i * 4]! - 1;
        const v1Idx = tetrahedra[i * 4 + 1]! - 1;
        const v2Idx = tetrahedra[i * 4 + 2]! - 1;
        const v3Idx = tetrahedra[i * 4 + 3]! - 1;

        // Compute centroid x coordinate (in original mesh coordinates)
        const centroidX = (
          vertices[v0Idx * 3]! +
          vertices[v1Idx * 3]! +
          vertices[v2Idx * 3]! +
          vertices[v3Idx * 3]!
        ) / 4;

        // Only include tetrahedra whose centroid is below the clip threshold
        if (centroidX < clipThreshold) {
          visibleTetIndices.push([v0Idx, v1Idx, v2Idx, v3Idx]);
          visibleTetOriginalIndices.push(i);
        }
      }

      // Build non-indexed faces for visible tetrahedra (4 faces per tetrahedron, 3 vertices per face)
      const nVisibleTets = visibleTetIndices.length;
      const nFaces = nVisibleTets * 4;
      const facePositions = new Float32Array(nFaces * 9); // 3 vertices * 3 coords per face

      // Store face vertex indices and tetrahedron index for quality mapping
      const faceIndices: number[][] = [];
      const tetIndices: number[] = [];

      let faceIdx = 0;
      for (let tetIdx = 0; tetIdx < visibleTetIndices.length; tetIdx++) {
        const tetVerts = visibleTetIndices[tetIdx]!;
        const v0 = tetVerts[0]!;
        const v1 = tetVerts[1]!;
        const v2 = tetVerts[2]!;
        const v3 = tetVerts[3]!;
        const origTetIdx = visibleTetOriginalIndices[tetIdx]!;

        // Face 0: v0, v2, v1
        faceIndices.push([v0, v2, v1]);
        tetIndices.push(origTetIdx);
        // Face 1: v0, v1, v3
        faceIndices.push([v0, v1, v3]);
        tetIndices.push(origTetIdx);
        // Face 2: v0, v3, v2
        faceIndices.push([v0, v3, v2]);
        tetIndices.push(origTetIdx);
        // Face 3: v1, v2, v3
        faceIndices.push([v1, v2, v3]);
        tetIndices.push(origTetIdx);

        // Build positions for each face
        const faces = [[v0, v2, v1], [v0, v1, v3], [v0, v3, v2], [v1, v2, v3]];
        for (const face of faces) {
          for (let j = 0; j < 3; j++) {
            const vIdx = face[j]! * 3;
            facePositions[faceIdx * 9 + j * 3] = positions[vIdx]!;
            facePositions[faceIdx * 9 + j * 3 + 1] = positions[vIdx + 1]!;
            facePositions[faceIdx * 9 + j * 3 + 2] = positions[vIdx + 2]!;
          }
          faceIdx++;
        }
      }

      geometry.deleteAttribute("position");
      geometry.setAttribute("position", new THREE.BufferAttribute(facePositions, 3));
      geometry.setIndex(null);
      geometry.computeVertexNormals();

      // Compute quality for each face using stored tetrahedra quality
      let tetFaceColors: Float32Array | null = null;
      if (viewerOptions.qualityMetric && mesh.quality && mesh.quality.length > 0 && faceIndices.length > 0) {
        const range = getMetricRange(mesh.quality);

        // Build vertex colors - each tetrahedron has 4 faces, all share the same quality
        // tetIndices maps face index to tetrahedron index
        tetFaceColors = new Float32Array(faceIndices.length * 9);
        for (let i = 0; i < faceIndices.length; i++) {
          const tetIdx = tetIndices[i]!;
          const quality = mesh.quality[tetIdx] ?? 0;
          const color = getColor(quality, range.min, range.max, viewerOptions.colormap);
          for (let j = 0; j < 3; j++) {
            tetFaceColors[i * 9 + j * 3] = color.r;
            tetFaceColors[i * 9 + j * 3 + 1] = color.g;
            tetFaceColors[i * 9 + j * 3 + 2] = color.b;
          }
        }
        // Set color attribute directly on geometry
        geometry.setAttribute("color", new THREE.BufferAttribute(tetFaceColors, 3));
      }

      // Build wireframe for visible tetrahedra (6 edges per tetrahedron)
      const wireframeGeometry = new THREE.BufferGeometry();
      const linePositions: number[] = [];
      for (const tetVerts of visibleTetIndices) {
        const v0 = tetVerts[0]!;
        const v1 = tetVerts[1]!;
        const v2 = tetVerts[2]!;
        const v3 = tetVerts[3]!;
        const p0 = v0 * 3, p1 = v1 * 3, p2 = v2 * 3, p3 = v3 * 3;
        // Edge v0-v1
        linePositions.push(positions[p0]!, positions[p0 + 1]!, positions[p0 + 2]!);
        linePositions.push(positions[p1]!, positions[p1 + 1]!, positions[p1 + 2]!);
        // Edge v0-v2
        linePositions.push(positions[p0]!, positions[p0 + 1]!, positions[p0 + 2]!);
        linePositions.push(positions[p2]!, positions[p2 + 1]!, positions[p2 + 2]!);
        // Edge v0-v3
        linePositions.push(positions[p0]!, positions[p0 + 1]!, positions[p0 + 2]!);
        linePositions.push(positions[p3]!, positions[p3 + 1]!, positions[p3 + 2]!);
        // Edge v1-v2
        linePositions.push(positions[p1]!, positions[p1 + 1]!, positions[p1 + 2]!);
        linePositions.push(positions[p2]!, positions[p2 + 1]!, positions[p2 + 2]!);
        // Edge v1-v3
        linePositions.push(positions[p1]!, positions[p1 + 1]!, positions[p1 + 2]!);
        linePositions.push(positions[p3]!, positions[p3 + 1]!, positions[p3 + 2]!);
        // Edge v2-v3
        linePositions.push(positions[p2]!, positions[p2 + 1]!, positions[p2 + 2]!);
        linePositions.push(positions[p3]!, positions[p3 + 1]!, positions[p3 + 2]!);
      }
      if (linePositions.length > 0) {
        wireframeGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(linePositions, 3)
        );
      }

      // Create points geometry
      const pointsGeometry = new THREE.BufferGeometry();
      pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      return { geometry, wireframeGeometry, pointsGeometry, tetFaceColors };
    }

    // Default: use surface triangles (non-clipped view)
    // Use non-indexed geometry for consistent rendering across all code paths
    if (triangles && nTris > 0) {
      const facePositions = new Float32Array(nTris * 9);
      for (let i = 0; i < nTris; i++) {
        for (let j = 0; j < 3; j++) {
          const vIdx = (triangles[i * 3 + j]! - 1) * 3;
          facePositions[(i * 3 + j) * 3] = positions[vIdx]!;
          facePositions[(i * 3 + j) * 3 + 1] = positions[vIdx + 1]!;
          facePositions[(i * 3 + j) * 3 + 2] = positions[vIdx + 2]!;
        }
      }
      geometry.deleteAttribute("position");
      geometry.setAttribute("position", new THREE.BufferAttribute(facePositions, 3));
      geometry.setIndex(null);
      geometry.computeVertexNormals();
    }

    // Create wireframe geometry from triangles
    const wireframeGeometry = new THREE.BufferGeometry();
    if (triangles && nTris > 0) {
      const linePositions: number[] = [];
      for (let i = 0; i < nTris; i++) {
        const i0 = (triangles[i * 3]! - 1) * 3;
        const i1 = (triangles[i * 3 + 1]! - 1) * 3;
        const i2 = (triangles[i * 3 + 2]! - 1) * 3;

        linePositions.push(positions[i0]!, positions[i0 + 1]!, positions[i0 + 2]!);
        linePositions.push(positions[i1]!, positions[i1 + 1]!, positions[i1 + 2]!);
        linePositions.push(positions[i1]!, positions[i1 + 1]!, positions[i1 + 2]!);
        linePositions.push(positions[i2]!, positions[i2 + 1]!, positions[i2 + 2]!);
        linePositions.push(positions[i2]!, positions[i2 + 1]!, positions[i2 + 2]!);
        linePositions.push(positions[i0]!, positions[i0 + 1]!, positions[i0 + 2]!);
      }
      wireframeGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(linePositions, 3)
      );
    }

    // Create points geometry
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    return { geometry, wireframeGeometry, pointsGeometry, tetFaceColors: null };
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
      for (let j = 0; j < 3; j++) {
        vertexColors[(i * 3 + j) * 3] = faceColors[i * 3]!;
        vertexColors[(i * 3 + j) * 3 + 1] = faceColors[i * 3 + 1]!;
        vertexColors[(i * 3 + j) * 3 + 2] = faceColors[i * 3 + 2]!;
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
    const vertices = mesh.vertices;
    const nVerts = vertices.length / 3;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < nVerts; i++) {
      const x = vertices[i * 3]!;
      const y = vertices[i * 3 + 1]!;
      const z = vertices[i * 3 + 2]!;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    return {
      min: new THREE.Vector3(minX, minY, minZ),
      max: new THREE.Vector3(maxX, maxY, maxZ),
      center: new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2),
    };
  }, [mesh]);

  return (
    <div className="viewer-container h-full">
      {mesh && boundingBox ? (
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
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          No mesh data
        </div>
      )}
    </div>
  );
}
