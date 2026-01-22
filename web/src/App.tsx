import { useEffect, useCallback, useRef } from "react";
import { useMeshStore } from "@/stores/meshStore";
import { useMmgWasm } from "@/hooks/useMmgWasm";
import { Header, Tabs, StatusBar, PrivacyBanner } from "@/components/Layout";
import { ParameterPanel, FileControls, ViewControls } from "@/components/Controls";
import { MeshStats } from "@/components/Stats";
import { MeshViewer2D, MeshViewer3D, ColorBar } from "@/components/Viewer";
import { computeTriangleQuality, getMetricRange } from "@/utils/meshQuality";
import type { MeshData, MeshStats as MeshStatsType } from "@/types/mesh";

// Default test meshes
const squareMesh: MeshData = {
  vertices: new Float64Array([0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0]),
  triangles: new Int32Array([1, 2, 3, 1, 3, 4]),
  edges: new Int32Array([1, 2, 2, 3, 3, 4, 4, 1]),
};
const squareStats: MeshStatsType = {
  nVertices: 4,
  nTriangles: 2,
  nEdges: 4,
  nTetrahedra: 0,
};

const tetraMesh: MeshData = {
  vertices: new Float64Array([
    0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 0.87, 0.0, 0.5, 0.29, 0.82,
  ]),
  triangles: new Int32Array([1, 3, 2, 1, 2, 4, 2, 3, 4, 3, 1, 4]),
  edges: new Int32Array([1, 2, 2, 3, 3, 1, 1, 4, 2, 4, 3, 4]),
};
const tetraStats: MeshStatsType = {
  nVertices: 4,
  nTriangles: 4,
  nEdges: 6,
  nTetrahedra: 0,
};

const cubeMesh: MeshData = {
  vertices: new Float64Array([
    0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0,
  ]),
  tetrahedra: new Int32Array([
    1, 2, 3, 7, 1, 3, 4, 7, 1, 4, 8, 7, 1, 8, 5, 7, 1, 5, 6, 7, 1, 6, 2, 7,
  ]),
  triangles: new Int32Array([
    1, 3, 2, 1, 4, 3, 5, 6, 7, 5, 7, 8, 1, 2, 6, 1, 6, 5, 3, 8, 4, 3, 7, 8, 1,
    5, 8, 1, 8, 4, 2, 3, 7, 2, 7, 6,
  ]),
};
const cubeStats: MeshStatsType = {
  nVertices: 8,
  nTriangles: 12,
  nEdges: 0,
  nTetrahedra: 6,
};

export default function App() {
  const {
    activeMeshType,
    wasmStatus,
    meshData,
    params,
    viewerOptions,
    liveRemesh,
    setMeshBefore,
    setMeshAfter,
    setIsRemeshing,
    setStatusMessage,
  } = useMeshStore();

  const { isLoaded, remesh, loadMeshFile, saveMeshFile } = useMmgWasm();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize default meshes when WASM is loaded
  useEffect(() => {
    if (isLoaded) {
      setMeshBefore("mmg2d", squareMesh, squareStats);
      setMeshBefore("mmgs", tetraMesh, tetraStats);
      setMeshBefore("mmg3d", cubeMesh, cubeStats);

      // Initial remesh
      handleRemesh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Live remesh when parameters change
  useEffect(() => {
    if (!liveRemesh || !isLoaded) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleRemesh();
    }, 100);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, liveRemesh, isLoaded, activeMeshType]);

  const handleRemesh = useCallback(async () => {
    if (!isLoaded) return;

    const currentData = meshData[activeMeshType];
    const inputMesh = currentData.before;
    if (!inputMesh) return;

    setIsRemeshing(true);
    try {
      const result = await remesh(activeMeshType, inputMesh, params[activeMeshType]);
      setMeshAfter(activeMeshType, result.mesh, result.stats);
      setStatusMessage({
        type: "success",
        message: `Remeshed: ${result.stats.nVertices} vertices, ${result.stats.nTriangles} triangles`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        message: `Remesh failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    } finally {
      setIsRemeshing(false);
    }
  }, [
    isLoaded,
    activeMeshType,
    meshData,
    params,
    remesh,
    setMeshAfter,
    setIsRemeshing,
    setStatusMessage,
  ]);

  const handleFileLoad = useCallback(
    async (file: File) => {
      if (!isLoaded) return;

      setIsRemeshing(true);
      try {
        const result = await loadMeshFile(activeMeshType, file);
        setMeshBefore(activeMeshType, result.mesh, result.stats);
        setStatusMessage({
          type: "success",
          message: `Loaded: ${file.name}`,
        });
        // Remesh after loading
        const remeshed = await remesh(
          activeMeshType,
          result.mesh,
          params[activeMeshType]
        );
        setMeshAfter(activeMeshType, remeshed.mesh, remeshed.stats);
      } catch (err) {
        setStatusMessage({
          type: "error",
          message: `Load failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      } finally {
        setIsRemeshing(false);
      }
    },
    [
      isLoaded,
      activeMeshType,
      params,
      loadMeshFile,
      remesh,
      setMeshBefore,
      setMeshAfter,
      setIsRemeshing,
      setStatusMessage,
    ]
  );

  const handleExport = useCallback(
    async (filename: string) => {
      if (!isLoaded) return;

      const currentData = meshData[activeMeshType];
      const meshToExport = currentData.after ?? currentData.before;
      if (!meshToExport) return;

      try {
        const content = await saveMeshFile(activeMeshType, meshToExport, filename);
        const blob = new Blob([content], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setStatusMessage({
          type: "success",
          message: `Exported: ${filename}`,
        });
      } catch (err) {
        setStatusMessage({
          type: "error",
          message: `Export failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }
    },
    [isLoaded, activeMeshType, meshData, saveMeshFile, setStatusMessage]
  );

  const currentMeshData = meshData[activeMeshType];
  const is2D = activeMeshType === "mmg2d";
  const disabled = wasmStatus !== "ready";

  // Compute quality range for color bar
  const qualityRange = (() => {
    const mesh = currentMeshData.after ?? currentMeshData.before;
    if (!mesh?.triangles || !viewerOptions.qualityMetric) return null;
    const quality = computeTriangleQuality(
      mesh.vertices,
      mesh.triangles,
      viewerOptions.qualityMetric,
      is2D ? 2 : 3
    );
    return getMetricRange(quality);
  })();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      <Tabs />
      <PrivacyBanner />

      <main className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          {/* Left panel - controls */}
          <div className="lg:col-span-1 space-y-4">
            <ParameterPanel
              meshType={activeMeshType}
              onRemesh={handleRemesh}
              disabled={disabled}
            />
            <FileControls
              meshType={activeMeshType}
              onFileLoad={handleFileLoad}
              onExport={handleExport}
              meshData={currentMeshData.after ?? currentMeshData.before}
              disabled={disabled}
            />
            <ViewControls show3DControls={!is2D} />
            <MeshStats
              meshType={activeMeshType}
              statsBefore={currentMeshData.statsBefore}
              statsAfter={currentMeshData.statsAfter}
            />
          </div>

          {/* Right panel - viewers */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {qualityRange && <ColorBar min={qualityRange.min} max={qualityRange.max} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
              {is2D ? (
                <>
                  <MeshViewer2D
                    mesh={currentMeshData.before}
                    label="Before"
                  />
                  <MeshViewer2D
                    mesh={currentMeshData.after}
                    label="After"
                  />
                </>
              ) : (
                <>
                  <MeshViewer3D
                    mesh={currentMeshData.before}
                    label="Before"
                  />
                  <MeshViewer3D
                    mesh={currentMeshData.after}
                    label="After"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <StatusBar />
    </div>
  );
}
