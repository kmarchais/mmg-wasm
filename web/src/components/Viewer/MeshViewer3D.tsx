import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { useMeshStore } from "@/stores/meshStore";
import type { MeshData } from "@/types/mesh";
import { computeTriangleQuality } from "@/utils/meshQuality";
import { getColorArray } from "@/utils/colorMapping";

interface MeshViewer3DProps {
  mesh: MeshData | null;
  label: string;
}

function MeshGeometry({ mesh }: { mesh: MeshData }) {
  const { viewerOptions } = useMeshStore();
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, wireframeGeometry, pointsGeometry } = useMemo(() => {
    const vertices = mesh.vertices;
    const triangles = mesh.triangles;
    const nVerts = vertices.length / 3;
    const nTris = triangles ? triangles.length / 3 : 0;

    // Compute bounding box for centering
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

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Create positions array (centered)
    const positions = new Float32Array(nVerts * 3);
    for (let i = 0; i < nVerts; i++) {
      positions[i * 3] = vertices[i * 3]! - centerX;
      positions[i * 3 + 1] = vertices[i * 3 + 1]! - centerY;
      positions[i * 3 + 2] = vertices[i * 3 + 2]! - centerZ;
    }

    // Create indexed geometry for faces
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    if (triangles && nTris > 0) {
      // Convert 1-indexed to 0-indexed
      const indices = new Uint32Array(nTris * 3);
      for (let i = 0; i < nTris * 3; i++) {
        indices[i] = triangles[i]! - 1;
      }
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.computeVertexNormals();
    }

    // Create wireframe geometry
    const wireframeGeometry = new THREE.BufferGeometry();
    if (triangles && nTris > 0) {
      const linePositions: number[] = [];
      for (let i = 0; i < nTris; i++) {
        const i0 = (triangles[i * 3]! - 1) * 3;
        const i1 = (triangles[i * 3 + 1]! - 1) * 3;
        const i2 = (triangles[i * 3 + 2]! - 1) * 3;

        // Edge 0-1
        linePositions.push(positions[i0]!, positions[i0 + 1]!, positions[i0 + 2]!);
        linePositions.push(positions[i1]!, positions[i1 + 1]!, positions[i1 + 2]!);
        // Edge 1-2
        linePositions.push(positions[i1]!, positions[i1 + 1]!, positions[i1 + 2]!);
        linePositions.push(positions[i2]!, positions[i2 + 1]!, positions[i2 + 2]!);
        // Edge 2-0
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

    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
    return {
      geometry,
      wireframeGeometry,
      pointsGeometry,
      center: new THREE.Vector3(centerX, centerY, centerZ),
      size,
    };
  }, [mesh]);

  // Compute quality colors
  const colors = useMemo(() => {
    if (!viewerOptions.qualityMetric || !mesh.triangles) return null;

    const quality = computeTriangleQuality(
      mesh.vertices,
      mesh.triangles,
      viewerOptions.qualityMetric,
      3
    );

    // Per-face colors need to be expanded to per-vertex for the indexed geometry
    // We need to unindex the geometry or use vertex colors differently
    // For simplicity, create per-face colors array
    const nTris = mesh.triangles.length / 3;
    const faceColors = getColorArray(quality, viewerOptions.colormap);

    // Expand to per-vertex (3 vertices per triangle)
    const vertexColors = new Float32Array(nTris * 3 * 3);
    for (let i = 0; i < nTris; i++) {
      for (let j = 0; j < 3; j++) {
        vertexColors[(i * 3 + j) * 3] = faceColors[i * 3]!;
        vertexColors[(i * 3 + j) * 3 + 1] = faceColors[i * 3 + 1]!;
        vertexColors[(i * 3 + j) * 3 + 2] = faceColors[i * 3 + 2]!;
      }
    }

    return vertexColors;
  }, [mesh, viewerOptions.qualityMetric, viewerOptions.colormap]);

  // Update geometry colors
  useMemo(() => {
    if (colors && mesh.triangles) {
      // Need non-indexed geometry for per-face colors
      const nTris = mesh.triangles.length / 3;
      const positions = new Float32Array(nTris * 9);
      const vertices = mesh.vertices;
      const triangles = mesh.triangles;

      // Compute center for centering
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      const nVerts = vertices.length / 3;

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

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;

      for (let i = 0; i < nTris; i++) {
        for (let j = 0; j < 3; j++) {
          const vIdx = (triangles[i * 3 + j]! - 1) * 3;
          positions[(i * 3 + j) * 3] = vertices[vIdx]! - centerX;
          positions[(i * 3 + j) * 3 + 1] = vertices[vIdx + 1]! - centerY;
          positions[(i * 3 + j) * 3 + 2] = vertices[vIdx + 2]! - centerZ;
        }
      }

      geometry.deleteAttribute("position");
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(null);
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.computeVertexNormals();
    } else {
      geometry.deleteAttribute("color");
    }
  }, [colors, mesh, geometry]);

  return (
    <group>
      {viewerOptions.showFaces && (
        <mesh ref={meshRef} geometry={geometry}>
          <meshStandardMaterial
            color={colors ? "#ffffff" : "#e8f4fd"}
            vertexColors={!!colors}
            side={THREE.DoubleSide}
            flatShading={!!colors}
          />
        </mesh>
      )}
      {viewerOptions.showWireframe && (
        <lineSegments ref={wireframeRef} geometry={wireframeGeometry}>
          <lineBasicMaterial color="#0066cc" linewidth={1} />
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

export function MeshViewer3D({ mesh, label }: MeshViewer3DProps) {
  return (
    <div className="flex flex-col h-full">
      <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
      <div className="viewer-container flex-1 min-h-[250px]">
        {mesh ? (
          <Canvas
            camera={{ position: [2, 2, 2], fov: 50 }}
            style={{ background: "#f8f9fa" }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <directionalLight position={[-5, -5, -5]} intensity={0.3} />
            <MeshGeometry mesh={mesh} />
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
    </div>
  );
}
