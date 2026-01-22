import { useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useMeshStore } from "@/stores/meshStore";
import { useMmgWasm } from "@/hooks/useMmgWasm";
import { Header, StatusBar, PrivacyBanner } from "@/components/Layout";
import { ParameterPanel, ViewControls } from "@/components/Controls";
import { MeshStatsOverlay } from "@/components/Stats";
import { MeshViewer2D, MeshViewer3D, ColorBar } from "@/components/Viewer";
import { getMetricRange, getMeshScale } from "@/utils/meshQuality";
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
    theme,
    showOriginalMesh,
    setMeshBefore,
    setMeshAfter,
    setIsRemeshing,
    setStatusMessage,
    setShowOriginalMesh,
  } = useMeshStore();

  const { isLoaded, remesh, loadMeshFile, saveMeshFile, computeQuality } = useMmgWasm();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme to document synchronously before paint
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Initialize default meshes when WASM is loaded
  useEffect(() => {
    if (isLoaded) {
      // Set initial meshes and compute their quality and scale
      const initMeshes = async () => {
        // MMG2D
        const quality2d = await computeQuality("mmg2d", squareMesh);
        const scale2d = getMeshScale(squareMesh, true);
        setMeshBefore("mmg2d", { ...squareMesh, quality: quality2d }, squareStats, scale2d);

        // MMGS
        const qualityS = await computeQuality("mmgs", tetraMesh);
        const scaleS = getMeshScale(tetraMesh, false);
        setMeshBefore("mmgs", { ...tetraMesh, quality: qualityS }, tetraStats, scaleS);

        // MMG3D
        const quality3d = await computeQuality("mmg3d", cubeMesh);
        const scale3d = getMeshScale(cubeMesh, false);
        setMeshBefore("mmg3d", { ...cubeMesh, quality: quality3d }, cubeStats, scale3d);

        // Initial remesh
        handleRemesh();
      };
      initMeshes();
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
    setShowOriginalMesh(false);
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
    setShowOriginalMesh,
  ]);

  const handleFileLoad = useCallback(
    async (file: File) => {
      if (!isLoaded) return;

      setIsRemeshing(true);
      try {
        const result = await loadMeshFile(activeMeshType, file);
        const is2D = activeMeshType === "mmg2d";
        const scale = getMeshScale(result.mesh, is2D);
        setMeshBefore(activeMeshType, result.mesh, result.stats, scale);
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

  const handleExport = useCallback(async () => {
    if (!isLoaded) return;

    const currentData = meshData[activeMeshType];
    const meshToExport = currentData.after ?? currentData.before;
    if (!meshToExport) return;

    const ext = ".mesh";
    const prefix = activeMeshType === "mmg2d" ? "mesh2d" : activeMeshType === "mmgs" ? "surface" : "mesh3d";
    const filename = `${prefix}_remeshed${ext}`;

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
  }, [isLoaded, activeMeshType, meshData, saveMeshFile, setStatusMessage]);

  const currentMeshData = meshData[activeMeshType];
  const is2D = activeMeshType === "mmg2d";
  const disabled = wasmStatus !== "ready";

  // Determine which mesh to show
  const displayMesh = showOriginalMesh
    ? currentMeshData.before
    : (currentMeshData.after ?? currentMeshData.before);
  const displayStats = showOriginalMesh
    ? currentMeshData.statsBefore
    : (currentMeshData.statsAfter ?? currentMeshData.statsBefore);

  // Get quality range for color bar from stored quality data
  const qualityRange = (() => {
    if (!displayMesh?.quality || displayMesh.quality.length === 0 || !viewerOptions.qualityMetric) return null;
    return getMetricRange(displayMesh.quality);
  })();

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Header
        onFileLoad={handleFileLoad}
        onExport={handleExport}
        disabled={disabled}
      />
      <PrivacyBanner />

      <main className="flex-1 flex gap-4 p-4 min-h-0">
        {/* Left panel - controls */}
        <div className="w-72 flex-shrink-0 space-y-4 overflow-y-auto">
          <ParameterPanel
            meshType={activeMeshType}
            onRemesh={handleRemesh}
            disabled={disabled}
          />
          <ViewControls show3DControls={!is2D} meshType={activeMeshType} />

          {/* Show original mesh toggle */}
          {currentMeshData.after && (
            <div className="panel">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOriginalMesh}
                  onChange={(e) => setShowOriginalMesh(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Show original mesh
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Right panel - viewer */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {qualityRange && <ColorBar min={qualityRange.min} max={qualityRange.max} />}
          <div className="flex-1 relative min-h-0">
            {is2D ? (
              <MeshViewer2D mesh={displayMesh} />
            ) : (
              <MeshViewer3D mesh={displayMesh} />
            )}
            <MeshStatsOverlay meshType={activeMeshType} stats={displayStats} />
            {showOriginalMesh && (
              <div className="absolute top-2 left-2 bg-amber-500/90 text-white text-xs font-medium px-2 py-1 rounded">
                Original
              </div>
            )}
          </div>
        </div>
      </main>

      <StatusBar />
    </div>
  );
}
