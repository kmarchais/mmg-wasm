import {
  ParameterPanel,
  SampleSelector,
  ViewControls,
} from "@/components/Controls";
import { Header, PrivacyBanner, StatusBar } from "@/components/Layout";
import { MeshStatsOverlay, StatsComparison } from "@/components/Stats";
import { ColorBar, MeshViewer2D, MeshViewer3D } from "@/components/Viewer";
import {
  type SampleMesh,
  cubeMesh,
  cubeStats,
  squareMesh,
  squareStats,
  tetraMesh,
  tetraStats,
} from "@/fixtures/defaultMeshes";
import { useMmgWasm } from "@/hooks/useMmgWasm";
import { useMeshStore } from "@/stores/meshStore";
import { getMeshScale, getMetricRange } from "@/utils/meshQuality";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

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
    setParams,
  } = useMeshStore();

  const { isLoaded, remesh, loadMeshFile, saveMeshFile, computeQuality } =
    useMmgWasm();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to hold the latest handleRemesh without causing re-runs
  const handleRemeshRef = useRef<() => Promise<void>>(() => Promise.resolve());

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
        setMeshBefore(
          "mmg2d",
          { ...squareMesh, quality: quality2d },
          squareStats,
          scale2d,
        );
        setParams("mmg2d", { hmax: scale2d * 0.1 });

        // MMGS
        const qualityS = await computeQuality("mmgs", tetraMesh);
        const scaleS = getMeshScale(tetraMesh, false);
        setMeshBefore(
          "mmgs",
          { ...tetraMesh, quality: qualityS },
          tetraStats,
          scaleS,
        );
        setParams("mmgs", { hmax: scaleS * 0.15 });

        // MMG3D
        const quality3d = await computeQuality("mmg3d", cubeMesh);
        const scale3d = getMeshScale(cubeMesh, false);
        setMeshBefore(
          "mmg3d",
          { ...cubeMesh, quality: quality3d },
          cubeStats,
          scale3d,
        );
        setParams("mmg3d", { hmax: scale3d * 0.2 });

        // Initial remesh - use ref to avoid stale closure
        handleRemeshRef.current();
      };
      initMeshes();
    }
  }, [isLoaded, computeQuality, setMeshBefore, setParams]);

  // Live remesh when parameters change
  useEffect(() => {
    if (!liveRemesh || !isLoaded) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      // Use ref to get latest handleRemesh without dependency
      handleRemeshRef.current();
    }, 100);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [params, liveRemesh, isLoaded, activeMeshType]);

  const handleRemesh = useCallback(async () => {
    if (!isLoaded) return;

    const currentData = meshData[activeMeshType];
    const inputMesh = currentData.before;
    if (!inputMesh) return;

    setIsRemeshing(true);
    setShowOriginalMesh(false);
    try {
      const result = await remesh(
        activeMeshType,
        inputMesh,
        params[activeMeshType],
      );
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

  // Keep handleRemeshRef updated with the latest handleRemesh
  useEffect(() => {
    handleRemeshRef.current = handleRemesh;
  }, [handleRemesh]);

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
          params[activeMeshType],
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
    ],
  );

  const handleExport = useCallback(async () => {
    if (!isLoaded) return;

    const currentData = meshData[activeMeshType];
    const meshToExport = currentData.after ?? currentData.before;
    if (!meshToExport) return;

    const ext = ".mesh";
    const prefix =
      activeMeshType === "mmg2d"
        ? "mesh2d"
        : activeMeshType === "mmgs"
          ? "surface"
          : "mesh3d";
    const filename = `${prefix}_remeshed${ext}`;

    try {
      const content = await saveMeshFile(
        activeMeshType,
        meshToExport,
        filename,
      );
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

  const handleSampleSelect = useCallback(
    async (sample: SampleMesh) => {
      if (!isLoaded) return;

      setIsRemeshing(true);
      try {
        const is2D = activeMeshType === "mmg2d";
        const quality = await computeQuality(activeMeshType, sample.mesh);
        const scale = getMeshScale(sample.mesh, is2D);
        setMeshBefore(
          activeMeshType,
          { ...sample.mesh, quality },
          sample.stats,
          scale,
        );
        setStatusMessage({
          type: "success",
          message: `Loaded sample: ${sample.name}`,
        });
        // Remesh after loading
        const remeshed = await remesh(
          activeMeshType,
          sample.mesh,
          params[activeMeshType],
        );
        setMeshAfter(activeMeshType, remeshed.mesh, remeshed.stats);
      } catch (err) {
        setStatusMessage({
          type: "error",
          message: `Sample load failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      } finally {
        setIsRemeshing(false);
      }
    },
    [
      isLoaded,
      activeMeshType,
      params,
      computeQuality,
      remesh,
      setMeshBefore,
      setMeshAfter,
      setIsRemeshing,
      setStatusMessage,
    ],
  );

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
    if (
      !displayMesh?.quality ||
      displayMesh.quality.length === 0 ||
      !viewerOptions.qualityMetric
    )
      return null;
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
          <SampleSelector
            meshType={activeMeshType}
            onSelect={handleSampleSelect}
            disabled={disabled}
          />
          <ViewControls show3DControls={!is2D} meshType={activeMeshType} />
          <StatsComparison
            meshType={activeMeshType}
            statsBefore={currentMeshData.statsBefore}
            statsAfter={currentMeshData.statsAfter}
          />

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
          {qualityRange && (
            <ColorBar min={qualityRange.min} max={qualityRange.max} />
          )}
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
