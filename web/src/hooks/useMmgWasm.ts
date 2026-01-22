import { useEffect, useRef, useCallback, useState } from "react";
import { useMeshStore } from "@/stores/meshStore";
import type { MeshType, MeshData, MeshStats, RemeshParams } from "@/types/mesh";
import { DPARAM_2D, IPARAM_2D } from "../../../src/mmg2d";
import { DPARAM_S, IPARAM_S } from "../../../src/mmgs";
import { DPARAM, IPARAM } from "../../../src/mmg3d";

interface MmgModule {
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPF64: Float64Array;
  HEAP32: Int32Array;
  getValue: (ptr: number, type: string) => number;
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
  };
  // MMG2D functions
  _mmg2d_init: () => number;
  _mmg2d_free: (handle: number) => number;
  _mmg2d_set_mesh_size: (
    handle: number,
    np: number,
    nt: number,
    nq: number,
    na: number
  ) => number;
  _mmg2d_get_mesh_size: (
    handle: number,
    npPtr: number,
    ntPtr: number,
    nqPtr: number,
    naPtr: number
  ) => number;
  _mmg2d_set_vertices: (
    handle: number,
    verticesPtr: number,
    refsPtr: number
  ) => number;
  _mmg2d_get_vertices: (handle: number, countPtr: number) => number;
  _mmg2d_set_triangles: (
    handle: number,
    triPtr: number,
    refsPtr: number
  ) => number;
  _mmg2d_get_triangles: (handle: number, countPtr: number) => number;
  _mmg2d_set_edges: (
    handle: number,
    edgesPtr: number,
    refsPtr: number
  ) => number;
  _mmg2d_get_edges: (handle: number, countPtr: number) => number;
  _mmg2d_set_iparameter: (handle: number, iparam: number, val: number) => number;
  _mmg2d_set_dparameter: (
    handle: number,
    dparam: number,
    val: number
  ) => number;
  _mmg2d_remesh: (handle: number) => number;
  _mmg2d_free_array: (ptr: number) => void;
  _mmg2d_load_mesh: (handle: number, filenamePtr: number) => number;
  _mmg2d_save_mesh: (handle: number, filenamePtr: number) => number;
  // MMGS functions
  _mmgs_init: () => number;
  _mmgs_free: (handle: number) => number;
  _mmgs_set_mesh_size: (
    handle: number,
    np: number,
    nt: number,
    na: number
  ) => number;
  _mmgs_get_mesh_size: (
    handle: number,
    npPtr: number,
    ntPtr: number,
    naPtr: number
  ) => number;
  _mmgs_set_vertices: (
    handle: number,
    verticesPtr: number,
    refsPtr: number
  ) => number;
  _mmgs_get_vertices: (handle: number, countPtr: number) => number;
  _mmgs_set_triangles: (
    handle: number,
    triPtr: number,
    refsPtr: number
  ) => number;
  _mmgs_get_triangles: (handle: number, countPtr: number) => number;
  _mmgs_set_edges: (
    handle: number,
    edgesPtr: number,
    refsPtr: number
  ) => number;
  _mmgs_get_edges: (handle: number, countPtr: number) => number;
  _mmgs_set_iparameter: (handle: number, iparam: number, val: number) => number;
  _mmgs_set_dparameter: (handle: number, dparam: number, val: number) => number;
  _mmgs_remesh: (handle: number) => number;
  _mmgs_free_array: (ptr: number) => void;
  _mmgs_load_mesh: (handle: number, filenamePtr: number) => number;
  _mmgs_save_mesh: (handle: number, filenamePtr: number) => number;
  // MMG3D functions
  _mmg3d_init: () => number;
  _mmg3d_free: (handle: number) => number;
  _mmg3d_set_mesh_size: (
    handle: number,
    np: number,
    ne: number,
    nprism: number,
    nt: number,
    nquad: number,
    na: number
  ) => number;
  _mmg3d_get_mesh_size: (
    handle: number,
    npPtr: number,
    nePtr: number,
    nprismPtr: number,
    ntPtr: number,
    nquadPtr: number,
    naPtr: number
  ) => number;
  _mmg3d_set_vertices: (
    handle: number,
    verticesPtr: number,
    refsPtr: number
  ) => number;
  _mmg3d_get_vertices: (handle: number, countPtr: number) => number;
  _mmg3d_set_tetrahedra: (
    handle: number,
    tetraPtr: number,
    refsPtr: number
  ) => number;
  _mmg3d_get_tetrahedra: (handle: number, countPtr: number) => number;
  _mmg3d_set_triangles: (
    handle: number,
    triPtr: number,
    refsPtr: number
  ) => number;
  _mmg3d_get_triangles: (handle: number, countPtr: number) => number;
  _mmg3d_set_iparameter: (handle: number, iparam: number, val: number) => number;
  _mmg3d_set_dparameter: (
    handle: number,
    dparam: number,
    val: number
  ) => number;
  _mmg3d_remesh: (handle: number) => number;
  _mmg3d_free_array: (ptr: number) => void;
  _mmg3d_load_mesh: (handle: number, filenamePtr: number) => number;
  _mmg3d_save_mesh: (handle: number, filenamePtr: number) => number;
  // Quality functions
  _mmg2d_get_triangle_quality: (handle: number, k: number) => number;
  _mmg2d_get_triangles_qualities: (handle: number, outCountPtr: number) => number;
  _mmgs_get_triangle_quality: (handle: number, k: number) => number;
  _mmgs_get_triangles_qualities: (handle: number, outCountPtr: number) => number;
  _mmg3d_get_tetrahedron_quality: (handle: number, k: number) => number;
  _mmg3d_get_tetrahedra_qualities: (handle: number, outCountPtr: number) => number;
  // String helpers
  lengthBytesUTF8: (str: string) => number;
  stringToUTF8: (str: string, ptr: number, maxBytes: number) => void;
}


let modulePromise: Promise<MmgModule> | null = null;
let moduleInstance: MmgModule | null = null;

async function loadModule(): Promise<MmgModule> {
  if (moduleInstance) return moduleInstance;
  if (modulePromise) return modulePromise;

  modulePromise = (async () => {
    const createModule = (await import("../../mmg.js")).default as () => Promise<MmgModule>;
    moduleInstance = await createModule();
    return moduleInstance;
  })();

  return modulePromise;
}

export function useMmgWasm() {
  const moduleRef = useRef<MmgModule | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { setWasmStatus, setStatusMessage } = useMeshStore();

  useEffect(() => {
    let mounted = true;

    async function init() {
      setWasmStatus("loading");
      try {
        const mod = await loadModule();
        if (mounted) {
          moduleRef.current = mod;
          setIsLoaded(true);
          setWasmStatus("ready");
          setStatusMessage({ type: "success", message: "WASM module loaded" });
        }
      } catch (err) {
        if (mounted) {
          setWasmStatus("error");
          setStatusMessage({
            type: "error",
            message: `Failed to load WASM module: ${err instanceof Error ? err.message : "Unknown error"}`,
          });
        }
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [setWasmStatus, setStatusMessage]);

  const remesh = useCallback(
    async (
      meshType: MeshType,
      inputMesh: MeshData,
      params: RemeshParams
    ): Promise<{ mesh: MeshData; stats: MeshStats }> => {
      const Module = moduleRef.current;
      if (!Module) throw new Error("WASM module not loaded");

      if (meshType === "mmg2d") {
        return remesh2D(Module, inputMesh, params);
      } else if (meshType === "mmgs") {
        return remeshS(Module, inputMesh, params);
      } else {
        return remesh3D(Module, inputMesh, params);
      }
    },
    []
  );

  const loadMeshFile = useCallback(
    async (
      meshType: MeshType,
      file: File
    ): Promise<{ mesh: MeshData; stats: MeshStats }> => {
      const Module = moduleRef.current;
      if (!Module) throw new Error("WASM module not loaded");

      const content = new Uint8Array(await file.arrayBuffer());
      const filename = `/tmp/${file.name}`;

      Module.FS.writeFile(filename, content);

      try {
        if (meshType === "mmg2d") {
          return loadMesh2D(Module, filename);
        } else if (meshType === "mmgs") {
          return loadMeshS(Module, filename);
        } else {
          return loadMesh3D(Module, filename);
        }
      } finally {
        try {
          Module.FS.unlink(filename);
        } catch {
          // Ignore cleanup errors
        }
      }
    },
    []
  );

  const saveMeshFile = useCallback(
    async (meshType: MeshType, mesh: MeshData, filename: string): Promise<Uint8Array> => {
      const Module = moduleRef.current;
      if (!Module) throw new Error("WASM module not loaded");

      const filepath = `/tmp/${filename}`;

      if (meshType === "mmg2d") {
        await saveMesh2D(Module, mesh, filepath);
      } else if (meshType === "mmgs") {
        await saveMeshS(Module, mesh, filepath);
      } else {
        await saveMesh3D(Module, mesh, filepath);
      }

      const content = Module.FS.readFile(filepath);
      Module.FS.unlink(filepath);
      return content;
    },
    []
  );

  const computeQuality = useCallback(
    async (
      meshType: MeshType,
      mesh: MeshData
    ): Promise<Float64Array> => {
      const Module = moduleRef.current;
      if (!Module) throw new Error("WASM module not loaded");

      if (meshType === "mmg2d") {
        return computeQuality2D(Module, mesh);
      } else if (meshType === "mmgs") {
        return computeQualityS(Module, mesh);
      } else {
        return computeQuality3D(Module, mesh);
      }
    },
    []
  );

  return { isLoaded, remesh, loadMeshFile, saveMeshFile, computeQuality };
}

// Helper functions for memory management
function allocFloat64(Module: MmgModule, data: Float64Array): number {
  const ptr = Module._malloc(data.byteLength);
  Module.HEAPF64.set(data, ptr / 8);
  return ptr;
}

function allocInt32(Module: MmgModule, data: Int32Array): number {
  const ptr = Module._malloc(data.byteLength);
  Module.HEAP32.set(data, ptr / 4);
  return ptr;
}

function allocString(Module: MmgModule, str: string): number {
  const len = Module.lengthBytesUTF8(str) + 1;
  const ptr = Module._malloc(len);
  Module.stringToUTF8(str, ptr, len);
  return ptr;
}

// MMG2D remeshing
async function remesh2D(
  Module: MmgModule,
  input: MeshData,
  params: RemeshParams
): Promise<{ mesh: MeshData; stats: MeshStats }> {
  const nVertices = input.vertices.length / 2;
  const nTriangles = input.triangles ? input.triangles.length / 3 : 0;
  const nEdges = input.edges ? input.edges.length / 2 : 0;

  const handle = Module._mmg2d_init();
  if (handle < 0) throw new Error("Failed to initialize MMG2D");

  try {
    let result = Module._mmg2d_set_mesh_size(
      handle,
      nVertices,
      nTriangles,
      0,
      nEdges
    );
    if (result !== 1) throw new Error("Failed to set mesh size");

    // Set vertices
    const vertPtr = allocFloat64(Module, input.vertices);
    result = Module._mmg2d_set_vertices(handle, vertPtr, 0);
    Module._free(vertPtr);
    if (result !== 1) throw new Error("Failed to set vertices");

    // Set triangles
    if (input.triangles && nTriangles > 0) {
      const triPtr = allocInt32(Module, input.triangles);
      result = Module._mmg2d_set_triangles(handle, triPtr, 0);
      Module._free(triPtr);
      if (result !== 1) throw new Error("Failed to set triangles");
    }

    // Set edges
    if (input.edges && nEdges > 0) {
      const edgePtr = allocInt32(Module, input.edges);
      result = Module._mmg2d_set_edges(handle, edgePtr, 0);
      Module._free(edgePtr);
      if (result !== 1) throw new Error("Failed to set edges");
    }

    // Set parameters
    Module._mmg2d_set_iparameter(handle, IPARAM_2D.verbose, -1);
    if (params.hmin !== undefined)
      Module._mmg2d_set_dparameter(handle, DPARAM_2D.hmin, params.hmin);
    if (params.hmax !== undefined)
      Module._mmg2d_set_dparameter(handle, DPARAM_2D.hmax, params.hmax);
    if (params.hsiz !== undefined)
      Module._mmg2d_set_dparameter(handle, DPARAM_2D.hsiz, params.hsiz);
    if (params.hausd !== undefined)
      Module._mmg2d_set_dparameter(handle, DPARAM_2D.hausd, params.hausd);
    if (params.hgrad !== undefined)
      Module._mmg2d_set_dparameter(handle, DPARAM_2D.hgrad, params.hgrad);

    // Remesh
    result = Module._mmg2d_remesh(handle);
    if (result > 1) console.warn(`MMG2D remesh returned code ${result}`);

    // Get output size
    const sizePtr = Module._malloc(4 * 4);
    Module._mmg2d_get_mesh_size(
      handle,
      sizePtr,
      sizePtr + 4,
      sizePtr + 8,
      sizePtr + 12
    );
    const outNv = Module.getValue(sizePtr, "i32");
    const outNt = Module.getValue(sizePtr + 4, "i32");
    const outNe = Module.getValue(sizePtr + 12, "i32");
    Module._free(sizePtr);

    // Get output vertices
    const countPtr = Module._malloc(4);
    const outVertPtr = Module._mmg2d_get_vertices(handle, countPtr);
    const vertCount = Module.getValue(countPtr, "i32");
    Module._free(countPtr);

    const outVertices = new Float64Array(vertCount * 2);
    if (outVertPtr && vertCount > 0) {
      outVertices.set(
        Module.HEAPF64.subarray(outVertPtr / 8, outVertPtr / 8 + vertCount * 2)
      );
      Module._mmg2d_free_array(outVertPtr);
    }

    // Get output triangles
    const triCountPtr = Module._malloc(4);
    const outTriPtr = Module._mmg2d_get_triangles(handle, triCountPtr);
    const triCount = Module.getValue(triCountPtr, "i32");
    Module._free(triCountPtr);

    const outTriangles = new Int32Array(triCount * 3);
    if (outTriPtr && triCount > 0) {
      outTriangles.set(
        Module.HEAP32.subarray(outTriPtr / 4, outTriPtr / 4 + triCount * 3)
      );
      Module._mmg2d_free_array(outTriPtr);
    }

    // Get output edges
    const edgeCountPtr = Module._malloc(4);
    const outEdgePtr = Module._mmg2d_get_edges(handle, edgeCountPtr);
    const edgeCount = Module.getValue(edgeCountPtr, "i32");
    Module._free(edgeCountPtr);

    const outEdges = new Int32Array(edgeCount * 2);
    if (outEdgePtr && edgeCount > 0) {
      outEdges.set(
        Module.HEAP32.subarray(outEdgePtr / 4, outEdgePtr / 4 + edgeCount * 2)
      );
      Module._mmg2d_free_array(outEdgePtr);
    }

    // Get quality
    let outQuality = new Float64Array(0);
    if (triCount > 0) {
      const qualCountPtr = Module._malloc(4);
      const qualPtr = Module._mmg2d_get_triangles_qualities(handle, qualCountPtr);
      const qualCount = Module.getValue(qualCountPtr, "i32");
      Module._free(qualCountPtr);

      if (qualPtr && qualCount > 0) {
        outQuality = new Float64Array(qualCount);
        outQuality.set(Module.HEAPF64.subarray(qualPtr / 8, qualPtr / 8 + qualCount));
        Module._mmg2d_free_array(qualPtr);
      }
    }

    return {
      mesh: {
        vertices: outVertices,
        triangles: outTriangles,
        edges: outEdges,
        quality: outQuality,
      },
      stats: {
        nVertices: outNv,
        nTriangles: outNt,
        nEdges: outNe,
        nTetrahedra: 0,
      },
    };
  } finally {
    Module._mmg2d_free(handle);
  }
}

// MMGS remeshing
async function remeshS(
  Module: MmgModule,
  input: MeshData,
  params: RemeshParams
): Promise<{ mesh: MeshData; stats: MeshStats }> {
  const nVertices = input.vertices.length / 3;
  const nTriangles = input.triangles ? input.triangles.length / 3 : 0;
  const nEdges = input.edges ? input.edges.length / 2 : 0;

  const handle = Module._mmgs_init();
  if (handle < 0) throw new Error("Failed to initialize MMGS");

  try {
    let result = Module._mmgs_set_mesh_size(handle, nVertices, nTriangles, nEdges);
    if (result !== 1) throw new Error("Failed to set mesh size");

    // Set vertices
    const vertPtr = allocFloat64(Module, input.vertices);
    result = Module._mmgs_set_vertices(handle, vertPtr, 0);
    Module._free(vertPtr);
    if (result !== 1) throw new Error("Failed to set vertices");

    // Set triangles
    if (input.triangles && nTriangles > 0) {
      const triPtr = allocInt32(Module, input.triangles);
      result = Module._mmgs_set_triangles(handle, triPtr, 0);
      Module._free(triPtr);
      if (result !== 1) throw new Error("Failed to set triangles");
    }

    // Set edges
    if (input.edges && nEdges > 0) {
      const edgePtr = allocInt32(Module, input.edges);
      result = Module._mmgs_set_edges(handle, edgePtr, 0);
      Module._free(edgePtr);
      if (result !== 1) throw new Error("Failed to set edges");
    }

    // Set parameters
    Module._mmgs_set_iparameter(handle, IPARAM_S.verbose, -1);
    if (params.hmin !== undefined)
      Module._mmgs_set_dparameter(handle, DPARAM_S.hmin, params.hmin);
    if (params.hmax !== undefined)
      Module._mmgs_set_dparameter(handle, DPARAM_S.hmax, params.hmax);
    if (params.hsiz !== undefined)
      Module._mmgs_set_dparameter(handle, DPARAM_S.hsiz, params.hsiz);
    if (params.hausd !== undefined)
      Module._mmgs_set_dparameter(handle, DPARAM_S.hausd, params.hausd);
    if (params.hgrad !== undefined)
      Module._mmgs_set_dparameter(handle, DPARAM_S.hgrad, params.hgrad);

    // Remesh
    result = Module._mmgs_remesh(handle);
    if (result > 1) console.warn(`MMGS remesh returned code ${result}`);

    // Get output size
    const sizePtr = Module._malloc(3 * 4);
    Module._mmgs_get_mesh_size(handle, sizePtr, sizePtr + 4, sizePtr + 8);
    const outNv = Module.getValue(sizePtr, "i32");
    const outNt = Module.getValue(sizePtr + 4, "i32");
    const outNe = Module.getValue(sizePtr + 8, "i32");
    Module._free(sizePtr);

    // Get output vertices
    const countPtr = Module._malloc(4);
    const outVertPtr = Module._mmgs_get_vertices(handle, countPtr);
    const vertCount = Module.getValue(countPtr, "i32");
    Module._free(countPtr);

    const outVertices = new Float64Array(vertCount * 3);
    if (outVertPtr && vertCount > 0) {
      outVertices.set(
        Module.HEAPF64.subarray(outVertPtr / 8, outVertPtr / 8 + vertCount * 3)
      );
      Module._mmgs_free_array(outVertPtr);
    }

    // Get output triangles
    const triCountPtr = Module._malloc(4);
    const outTriPtr = Module._mmgs_get_triangles(handle, triCountPtr);
    const triCount = Module.getValue(triCountPtr, "i32");
    Module._free(triCountPtr);

    const outTriangles = new Int32Array(triCount * 3);
    if (outTriPtr && triCount > 0) {
      outTriangles.set(
        Module.HEAP32.subarray(outTriPtr / 4, outTriPtr / 4 + triCount * 3)
      );
      Module._mmgs_free_array(outTriPtr);
    }

    // Get output edges
    const edgeCountPtr = Module._malloc(4);
    const outEdgePtr = Module._mmgs_get_edges(handle, edgeCountPtr);
    const edgeCount = Module.getValue(edgeCountPtr, "i32");
    Module._free(edgeCountPtr);

    const outEdges = new Int32Array(edgeCount * 2);
    if (outEdgePtr && edgeCount > 0) {
      outEdges.set(
        Module.HEAP32.subarray(outEdgePtr / 4, outEdgePtr / 4 + edgeCount * 2)
      );
      Module._mmgs_free_array(outEdgePtr);
    }

    // Get quality
    let outQuality = new Float64Array(0);
    if (triCount > 0) {
      const qualCountPtr = Module._malloc(4);
      const qualPtr = Module._mmgs_get_triangles_qualities(handle, qualCountPtr);
      const qualCount = Module.getValue(qualCountPtr, "i32");
      Module._free(qualCountPtr);

      if (qualPtr && qualCount > 0) {
        outQuality = new Float64Array(qualCount);
        outQuality.set(Module.HEAPF64.subarray(qualPtr / 8, qualPtr / 8 + qualCount));
        Module._mmgs_free_array(qualPtr);
      }
    }

    return {
      mesh: {
        vertices: outVertices,
        triangles: outTriangles,
        edges: outEdges,
        quality: outQuality,
      },
      stats: {
        nVertices: outNv,
        nTriangles: outNt,
        nEdges: outNe,
        nTetrahedra: 0,
      },
    };
  } finally {
    Module._mmgs_free(handle);
  }
}

// MMG3D remeshing
async function remesh3D(
  Module: MmgModule,
  input: MeshData,
  params: RemeshParams
): Promise<{ mesh: MeshData; stats: MeshStats }> {
  const nVertices = input.vertices.length / 3;
  const nTetrahedra = input.tetrahedra ? input.tetrahedra.length / 4 : 0;
  const nTriangles = input.triangles ? input.triangles.length / 3 : 0;

  const handle = Module._mmg3d_init();
  if (handle < 0) throw new Error("Failed to initialize MMG3D");

  try {
    let result = Module._mmg3d_set_mesh_size(
      handle,
      nVertices,
      nTetrahedra,
      0,
      nTriangles,
      0,
      0
    );
    if (result !== 1) throw new Error("Failed to set mesh size");

    // Set vertices
    const vertPtr = allocFloat64(Module, input.vertices);
    result = Module._mmg3d_set_vertices(handle, vertPtr, 0);
    Module._free(vertPtr);
    if (result !== 1) throw new Error("Failed to set vertices");

    // Set tetrahedra
    if (input.tetrahedra && nTetrahedra > 0) {
      const tetraPtr = allocInt32(Module, input.tetrahedra);
      result = Module._mmg3d_set_tetrahedra(handle, tetraPtr, 0);
      Module._free(tetraPtr);
      if (result !== 1) throw new Error("Failed to set tetrahedra");
    }

    // Set triangles
    if (input.triangles && nTriangles > 0) {
      const triPtr = allocInt32(Module, input.triangles);
      result = Module._mmg3d_set_triangles(handle, triPtr, 0);
      Module._free(triPtr);
      if (result !== 1) throw new Error("Failed to set triangles");
    }

    // Set parameters
    Module._mmg3d_set_iparameter(handle, IPARAM.verbose, -1);
    if (params.hmin !== undefined)
      Module._mmg3d_set_dparameter(handle, DPARAM.hmin, params.hmin);
    if (params.hmax !== undefined)
      Module._mmg3d_set_dparameter(handle, DPARAM.hmax, params.hmax);
    if (params.hsiz !== undefined)
      Module._mmg3d_set_dparameter(handle, DPARAM.hsiz, params.hsiz);
    if (params.hausd !== undefined)
      Module._mmg3d_set_dparameter(handle, DPARAM.hausd, params.hausd);
    if (params.hgrad !== undefined)
      Module._mmg3d_set_dparameter(handle, DPARAM.hgrad, params.hgrad);

    // Remesh
    result = Module._mmg3d_remesh(handle);
    if (result > 1) console.warn(`MMG3D remesh returned code ${result}`);

    // Get output size
    const sizePtr = Module._malloc(6 * 4);
    Module._mmg3d_get_mesh_size(
      handle,
      sizePtr,
      sizePtr + 4,
      sizePtr + 8,
      sizePtr + 12,
      sizePtr + 16,
      sizePtr + 20
    );
    const outNv = Module.getValue(sizePtr, "i32");
    const outNe = Module.getValue(sizePtr + 4, "i32");
    const outNt = Module.getValue(sizePtr + 12, "i32");
    Module._free(sizePtr);

    // Get output vertices
    const countPtr = Module._malloc(4);
    const outVertPtr = Module._mmg3d_get_vertices(handle, countPtr);
    const vertCount = Module.getValue(countPtr, "i32");
    Module._free(countPtr);

    const outVertices = new Float64Array(vertCount * 3);
    if (outVertPtr && vertCount > 0) {
      outVertices.set(
        Module.HEAPF64.subarray(outVertPtr / 8, outVertPtr / 8 + vertCount * 3)
      );
      Module._mmg3d_free_array(outVertPtr);
    }

    // Get output tetrahedra
    const tetraCountPtr = Module._malloc(4);
    const outTetraPtr = Module._mmg3d_get_tetrahedra(handle, tetraCountPtr);
    const tetraCount = Module.getValue(tetraCountPtr, "i32");
    Module._free(tetraCountPtr);

    const outTetrahedra = new Int32Array(tetraCount * 4);
    if (outTetraPtr && tetraCount > 0) {
      outTetrahedra.set(
        Module.HEAP32.subarray(outTetraPtr / 4, outTetraPtr / 4 + tetraCount * 4)
      );
      Module._mmg3d_free_array(outTetraPtr);
    }

    // Get output triangles
    const triCountPtr = Module._malloc(4);
    const outTriPtr = Module._mmg3d_get_triangles(handle, triCountPtr);
    const triCount = Module.getValue(triCountPtr, "i32");
    Module._free(triCountPtr);

    const outTriangles = new Int32Array(triCount * 3);
    if (outTriPtr && triCount > 0) {
      outTriangles.set(
        Module.HEAP32.subarray(outTriPtr / 4, outTriPtr / 4 + triCount * 3)
      );
      Module._mmg3d_free_array(outTriPtr);
    }

    // Get quality (for tetrahedra)
    let outQuality = new Float64Array(0);
    if (tetraCount > 0) {
      const qualCountPtr = Module._malloc(4);
      const qualPtr = Module._mmg3d_get_tetrahedra_qualities(handle, qualCountPtr);
      const qualCount = Module.getValue(qualCountPtr, "i32");
      Module._free(qualCountPtr);

      if (qualPtr && qualCount > 0) {
        outQuality = new Float64Array(qualCount);
        outQuality.set(Module.HEAPF64.subarray(qualPtr / 8, qualPtr / 8 + qualCount));
        Module._mmg3d_free_array(qualPtr);
      }
    }

    return {
      mesh: {
        vertices: outVertices,
        triangles: outTriangles,
        tetrahedra: outTetrahedra,
        quality: outQuality,
      },
      stats: {
        nVertices: outNv,
        nTriangles: outNt,
        nTetrahedra: outNe,
        nEdges: 0,
      },
    };
  } finally {
    Module._mmg3d_free(handle);
  }
}

// File loading functions
async function loadMesh2D(
  Module: MmgModule,
  filename: string
): Promise<{ mesh: MeshData; stats: MeshStats }> {
  const handle = Module._mmg2d_init();
  if (handle < 0) throw new Error("Failed to initialize MMG2D");

  try {
    const filenamePtr = allocString(Module, filename);
    const result = Module._mmg2d_load_mesh(handle, filenamePtr);
    Module._free(filenamePtr);
    if (result !== 1) throw new Error("Failed to load mesh file");

    // Get mesh size
    const sizePtr = Module._malloc(4 * 4);
    Module._mmg2d_get_mesh_size(
      handle,
      sizePtr,
      sizePtr + 4,
      sizePtr + 8,
      sizePtr + 12
    );
    const nv = Module.getValue(sizePtr, "i32");
    const nt = Module.getValue(sizePtr + 4, "i32");
    const ne = Module.getValue(sizePtr + 12, "i32");
    Module._free(sizePtr);

    // Get vertices
    const countPtr = Module._malloc(4);
    const vertPtr = Module._mmg2d_get_vertices(handle, countPtr);
    const vertCount = Module.getValue(countPtr, "i32");
    Module._free(countPtr);

    const vertices = new Float64Array(vertCount * 2);
    if (vertPtr && vertCount > 0) {
      vertices.set(
        Module.HEAPF64.subarray(vertPtr / 8, vertPtr / 8 + vertCount * 2)
      );
      Module._mmg2d_free_array(vertPtr);
    }

    // Get triangles
    const triCountPtr = Module._malloc(4);
    const triPtr = Module._mmg2d_get_triangles(handle, triCountPtr);
    const triCount = Module.getValue(triCountPtr, "i32");
    Module._free(triCountPtr);

    const triangles = new Int32Array(triCount * 3);
    if (triPtr && triCount > 0) {
      triangles.set(
        Module.HEAP32.subarray(triPtr / 4, triPtr / 4 + triCount * 3)
      );
      Module._mmg2d_free_array(triPtr);
    }

    // Get edges
    const edgeCountPtr = Module._malloc(4);
    const edgePtr = Module._mmg2d_get_edges(handle, edgeCountPtr);
    const edgeCount = Module.getValue(edgeCountPtr, "i32");
    Module._free(edgeCountPtr);

    const edges = new Int32Array(edgeCount * 2);
    if (edgePtr && edgeCount > 0) {
      edges.set(
        Module.HEAP32.subarray(edgePtr / 4, edgePtr / 4 + edgeCount * 2)
      );
      Module._mmg2d_free_array(edgePtr);
    }

    // Get quality
    let quality = new Float64Array(0);
    if (triCount > 0) {
      const qualCountPtr = Module._malloc(4);
      const qualPtr = Module._mmg2d_get_triangles_qualities(handle, qualCountPtr);
      const qualCount = Module.getValue(qualCountPtr, "i32");
      Module._free(qualCountPtr);

      if (qualPtr && qualCount > 0) {
        quality = new Float64Array(qualCount);
        quality.set(Module.HEAPF64.subarray(qualPtr / 8, qualPtr / 8 + qualCount));
        Module._mmg2d_free_array(qualPtr);
      }
    }

    return {
      mesh: { vertices, triangles, edges, quality },
      stats: { nVertices: nv, nTriangles: nt, nEdges: ne, nTetrahedra: 0 },
    };
  } finally {
    Module._mmg2d_free(handle);
  }
}

async function loadMeshS(
  Module: MmgModule,
  filename: string
): Promise<{ mesh: MeshData; stats: MeshStats }> {
  const handle = Module._mmgs_init();
  if (handle < 0) throw new Error("Failed to initialize MMGS");

  try {
    const filenamePtr = allocString(Module, filename);
    const result = Module._mmgs_load_mesh(handle, filenamePtr);
    Module._free(filenamePtr);
    if (result !== 1) throw new Error("Failed to load mesh file");

    // Get mesh size
    const sizePtr = Module._malloc(3 * 4);
    Module._mmgs_get_mesh_size(handle, sizePtr, sizePtr + 4, sizePtr + 8);
    const nv = Module.getValue(sizePtr, "i32");
    const nt = Module.getValue(sizePtr + 4, "i32");
    const ne = Module.getValue(sizePtr + 8, "i32");
    Module._free(sizePtr);

    // Get vertices
    const countPtr = Module._malloc(4);
    const vertPtr = Module._mmgs_get_vertices(handle, countPtr);
    const vertCount = Module.getValue(countPtr, "i32");
    Module._free(countPtr);

    const vertices = new Float64Array(vertCount * 3);
    if (vertPtr && vertCount > 0) {
      vertices.set(
        Module.HEAPF64.subarray(vertPtr / 8, vertPtr / 8 + vertCount * 3)
      );
      Module._mmgs_free_array(vertPtr);
    }

    // Get triangles
    const triCountPtr = Module._malloc(4);
    const triPtr = Module._mmgs_get_triangles(handle, triCountPtr);
    const triCount = Module.getValue(triCountPtr, "i32");
    Module._free(triCountPtr);

    const triangles = new Int32Array(triCount * 3);
    if (triPtr && triCount > 0) {
      triangles.set(
        Module.HEAP32.subarray(triPtr / 4, triPtr / 4 + triCount * 3)
      );
      Module._mmgs_free_array(triPtr);
    }

    // Get edges
    const edgeCountPtr = Module._malloc(4);
    const edgePtr = Module._mmgs_get_edges(handle, edgeCountPtr);
    const edgeCount = Module.getValue(edgeCountPtr, "i32");
    Module._free(edgeCountPtr);

    const edges = new Int32Array(edgeCount * 2);
    if (edgePtr && edgeCount > 0) {
      edges.set(
        Module.HEAP32.subarray(edgePtr / 4, edgePtr / 4 + edgeCount * 2)
      );
      Module._mmgs_free_array(edgePtr);
    }

    // Get quality
    let quality = new Float64Array(0);
    if (triCount > 0) {
      const qualCountPtr = Module._malloc(4);
      const qualPtr = Module._mmgs_get_triangles_qualities(handle, qualCountPtr);
      const qualCount = Module.getValue(qualCountPtr, "i32");
      Module._free(qualCountPtr);

      if (qualPtr && qualCount > 0) {
        quality = new Float64Array(qualCount);
        quality.set(Module.HEAPF64.subarray(qualPtr / 8, qualPtr / 8 + qualCount));
        Module._mmgs_free_array(qualPtr);
      }
    }

    return {
      mesh: { vertices, triangles, edges, quality },
      stats: { nVertices: nv, nTriangles: nt, nEdges: ne, nTetrahedra: 0 },
    };
  } finally {
    Module._mmgs_free(handle);
  }
}

async function loadMesh3D(
  Module: MmgModule,
  filename: string
): Promise<{ mesh: MeshData; stats: MeshStats }> {
  const handle = Module._mmg3d_init();
  if (handle < 0) throw new Error("Failed to initialize MMG3D");

  try {
    const filenamePtr = allocString(Module, filename);
    const result = Module._mmg3d_load_mesh(handle, filenamePtr);
    Module._free(filenamePtr);
    if (result !== 1) throw new Error("Failed to load mesh file");

    // Get mesh size
    const sizePtr = Module._malloc(6 * 4);
    Module._mmg3d_get_mesh_size(
      handle,
      sizePtr,
      sizePtr + 4,
      sizePtr + 8,
      sizePtr + 12,
      sizePtr + 16,
      sizePtr + 20
    );
    const nv = Module.getValue(sizePtr, "i32");
    const ne = Module.getValue(sizePtr + 4, "i32");
    const nt = Module.getValue(sizePtr + 12, "i32");
    Module._free(sizePtr);

    // Get vertices
    const countPtr = Module._malloc(4);
    const vertPtr = Module._mmg3d_get_vertices(handle, countPtr);
    const vertCount = Module.getValue(countPtr, "i32");
    Module._free(countPtr);

    const vertices = new Float64Array(vertCount * 3);
    if (vertPtr && vertCount > 0) {
      vertices.set(
        Module.HEAPF64.subarray(vertPtr / 8, vertPtr / 8 + vertCount * 3)
      );
      Module._mmg3d_free_array(vertPtr);
    }

    // Get tetrahedra
    const tetraCountPtr = Module._malloc(4);
    const tetraPtr = Module._mmg3d_get_tetrahedra(handle, tetraCountPtr);
    const tetraCount = Module.getValue(tetraCountPtr, "i32");
    Module._free(tetraCountPtr);

    const tetrahedra = new Int32Array(tetraCount * 4);
    if (tetraPtr && tetraCount > 0) {
      tetrahedra.set(
        Module.HEAP32.subarray(tetraPtr / 4, tetraPtr / 4 + tetraCount * 4)
      );
      Module._mmg3d_free_array(tetraPtr);
    }

    // Get triangles
    const triCountPtr = Module._malloc(4);
    const triPtr = Module._mmg3d_get_triangles(handle, triCountPtr);
    const triCount = Module.getValue(triCountPtr, "i32");
    Module._free(triCountPtr);

    const triangles = new Int32Array(triCount * 3);
    if (triPtr && triCount > 0) {
      triangles.set(
        Module.HEAP32.subarray(triPtr / 4, triPtr / 4 + triCount * 3)
      );
      Module._mmg3d_free_array(triPtr);
    }

    // Get quality (for tetrahedra)
    let quality = new Float64Array(0);
    if (tetraCount > 0) {
      const qualCountPtr = Module._malloc(4);
      const qualPtr = Module._mmg3d_get_tetrahedra_qualities(handle, qualCountPtr);
      const qualCount = Module.getValue(qualCountPtr, "i32");
      Module._free(qualCountPtr);

      if (qualPtr && qualCount > 0) {
        quality = new Float64Array(qualCount);
        quality.set(Module.HEAPF64.subarray(qualPtr / 8, qualPtr / 8 + qualCount));
        Module._mmg3d_free_array(qualPtr);
      }
    }

    return {
      mesh: { vertices, triangles, tetrahedra, quality },
      stats: { nVertices: nv, nTriangles: nt, nTetrahedra: ne, nEdges: 0 },
    };
  } finally {
    Module._mmg3d_free(handle);
  }
}

// File saving functions
async function saveMesh2D(
  Module: MmgModule,
  mesh: MeshData,
  filepath: string
): Promise<void> {
  const nVertices = mesh.vertices.length / 2;
  const nTriangles = mesh.triangles ? mesh.triangles.length / 3 : 0;
  const nEdges = mesh.edges ? mesh.edges.length / 2 : 0;

  const handle = Module._mmg2d_init();
  if (handle < 0) throw new Error("Failed to initialize MMG2D");

  try {
    let result = Module._mmg2d_set_mesh_size(handle, nVertices, nTriangles, 0, nEdges);
    if (result !== 1) throw new Error("Failed to set mesh size");

    const vertPtr = allocFloat64(Module, mesh.vertices);
    result = Module._mmg2d_set_vertices(handle, vertPtr, 0);
    Module._free(vertPtr);
    if (result !== 1) throw new Error("Failed to set vertices");

    if (mesh.triangles && nTriangles > 0) {
      const triPtr = allocInt32(Module, mesh.triangles);
      result = Module._mmg2d_set_triangles(handle, triPtr, 0);
      Module._free(triPtr);
      if (result !== 1) throw new Error("Failed to set triangles");
    }

    if (mesh.edges && nEdges > 0) {
      const edgePtr = allocInt32(Module, mesh.edges);
      result = Module._mmg2d_set_edges(handle, edgePtr, 0);
      Module._free(edgePtr);
      if (result !== 1) throw new Error("Failed to set edges");
    }

    const filenamePtr = allocString(Module, filepath);
    result = Module._mmg2d_save_mesh(handle, filenamePtr);
    Module._free(filenamePtr);
    if (result !== 1) throw new Error("Failed to save mesh");
  } finally {
    Module._mmg2d_free(handle);
  }
}

async function saveMeshS(
  Module: MmgModule,
  mesh: MeshData,
  filepath: string
): Promise<void> {
  const nVertices = mesh.vertices.length / 3;
  const nTriangles = mesh.triangles ? mesh.triangles.length / 3 : 0;
  const nEdges = mesh.edges ? mesh.edges.length / 2 : 0;

  const handle = Module._mmgs_init();
  if (handle < 0) throw new Error("Failed to initialize MMGS");

  try {
    let result = Module._mmgs_set_mesh_size(handle, nVertices, nTriangles, nEdges);
    if (result !== 1) throw new Error("Failed to set mesh size");

    const vertPtr = allocFloat64(Module, mesh.vertices);
    result = Module._mmgs_set_vertices(handle, vertPtr, 0);
    Module._free(vertPtr);
    if (result !== 1) throw new Error("Failed to set vertices");

    if (mesh.triangles && nTriangles > 0) {
      const triPtr = allocInt32(Module, mesh.triangles);
      result = Module._mmgs_set_triangles(handle, triPtr, 0);
      Module._free(triPtr);
      if (result !== 1) throw new Error("Failed to set triangles");
    }

    if (mesh.edges && nEdges > 0) {
      const edgePtr = allocInt32(Module, mesh.edges);
      result = Module._mmgs_set_edges(handle, edgePtr, 0);
      Module._free(edgePtr);
      if (result !== 1) throw new Error("Failed to set edges");
    }

    const filenamePtr = allocString(Module, filepath);
    result = Module._mmgs_save_mesh(handle, filenamePtr);
    Module._free(filenamePtr);
    if (result !== 1) throw new Error("Failed to save mesh");
  } finally {
    Module._mmgs_free(handle);
  }
}

async function saveMesh3D(
  Module: MmgModule,
  mesh: MeshData,
  filepath: string
): Promise<void> {
  const nVertices = mesh.vertices.length / 3;
  const nTetrahedra = mesh.tetrahedra ? mesh.tetrahedra.length / 4 : 0;
  const nTriangles = mesh.triangles ? mesh.triangles.length / 3 : 0;

  const handle = Module._mmg3d_init();
  if (handle < 0) throw new Error("Failed to initialize MMG3D");

  try {
    let result = Module._mmg3d_set_mesh_size(
      handle,
      nVertices,
      nTetrahedra,
      0,
      nTriangles,
      0,
      0
    );
    if (result !== 1) throw new Error("Failed to set mesh size");

    const vertPtr = allocFloat64(Module, mesh.vertices);
    result = Module._mmg3d_set_vertices(handle, vertPtr, 0);
    Module._free(vertPtr);
    if (result !== 1) throw new Error("Failed to set vertices");

    if (mesh.tetrahedra && nTetrahedra > 0) {
      const tetraPtr = allocInt32(Module, mesh.tetrahedra);
      result = Module._mmg3d_set_tetrahedra(handle, tetraPtr, 0);
      Module._free(tetraPtr);
      if (result !== 1) throw new Error("Failed to set tetrahedra");
    }

    if (mesh.triangles && nTriangles > 0) {
      const triPtr = allocInt32(Module, mesh.triangles);
      result = Module._mmg3d_set_triangles(handle, triPtr, 0);
      Module._free(triPtr);
      if (result !== 1) throw new Error("Failed to set triangles");
    }

    const filenamePtr = allocString(Module, filepath);
    result = Module._mmg3d_save_mesh(handle, filenamePtr);
    Module._free(filenamePtr);
    if (result !== 1) throw new Error("Failed to save mesh");
  } finally {
    Module._mmg3d_free(handle);
  }
}

// Quality computation functions
async function computeQuality2D(
  Module: MmgModule,
  mesh: MeshData
): Promise<Float64Array> {
  const nVertices = mesh.vertices.length / 2;
  const nTriangles = mesh.triangles ? mesh.triangles.length / 3 : 0;
  const nEdges = mesh.edges ? mesh.edges.length / 2 : 0;

  if (nTriangles === 0) return new Float64Array(0);

  const handle = Module._mmg2d_init();
  if (handle < 0) throw new Error("Failed to initialize MMG2D");

  try {
    let result = Module._mmg2d_set_mesh_size(handle, nVertices, nTriangles, 0, nEdges);
    if (result !== 1) throw new Error("Failed to set mesh size");

    const vertPtr = allocFloat64(Module, mesh.vertices);
    result = Module._mmg2d_set_vertices(handle, vertPtr, 0);
    Module._free(vertPtr);
    if (result !== 1) throw new Error("Failed to set vertices");

    if (mesh.triangles) {
      const triPtr = allocInt32(Module, mesh.triangles);
      result = Module._mmg2d_set_triangles(handle, triPtr, 0);
      Module._free(triPtr);
      if (result !== 1) throw new Error("Failed to set triangles");
    }

    if (mesh.edges && nEdges > 0) {
      const edgePtr = allocInt32(Module, mesh.edges);
      result = Module._mmg2d_set_edges(handle, edgePtr, 0);
      Module._free(edgePtr);
    }

    // Get qualities
    const countPtr = Module._malloc(4);
    const qualPtr = Module._mmg2d_get_triangles_qualities(handle, countPtr);
    const count = Module.getValue(countPtr, "i32");
    Module._free(countPtr);

    if (qualPtr === 0 || count === 0) {
      return new Float64Array(0);
    }

    const qualities = new Float64Array(count);
    qualities.set(Module.HEAPF64.subarray(qualPtr / 8, qualPtr / 8 + count));
    Module._mmg2d_free_array(qualPtr);

    return qualities;
  } finally {
    Module._mmg2d_free(handle);
  }
}

async function computeQualityS(
  Module: MmgModule,
  mesh: MeshData
): Promise<Float64Array> {
  const nVertices = mesh.vertices.length / 3;
  const nTriangles = mesh.triangles ? mesh.triangles.length / 3 : 0;
  const nEdges = mesh.edges ? mesh.edges.length / 2 : 0;

  if (nTriangles === 0) return new Float64Array(0);

  const handle = Module._mmgs_init();
  if (handle < 0) throw new Error("Failed to initialize MMGS");

  try {
    let result = Module._mmgs_set_mesh_size(handle, nVertices, nTriangles, nEdges);
    if (result !== 1) throw new Error("Failed to set mesh size");

    const vertPtr = allocFloat64(Module, mesh.vertices);
    result = Module._mmgs_set_vertices(handle, vertPtr, 0);
    Module._free(vertPtr);
    if (result !== 1) throw new Error("Failed to set vertices");

    if (mesh.triangles) {
      const triPtr = allocInt32(Module, mesh.triangles);
      result = Module._mmgs_set_triangles(handle, triPtr, 0);
      Module._free(triPtr);
      if (result !== 1) throw new Error("Failed to set triangles");
    }

    if (mesh.edges && nEdges > 0) {
      const edgePtr = allocInt32(Module, mesh.edges);
      result = Module._mmgs_set_edges(handle, edgePtr, 0);
      Module._free(edgePtr);
    }

    // Get qualities
    const countPtr = Module._malloc(4);
    const qualPtr = Module._mmgs_get_triangles_qualities(handle, countPtr);
    const count = Module.getValue(countPtr, "i32");
    Module._free(countPtr);

    if (qualPtr === 0 || count === 0) {
      return new Float64Array(0);
    }

    const qualities = new Float64Array(count);
    qualities.set(Module.HEAPF64.subarray(qualPtr / 8, qualPtr / 8 + count));
    Module._mmgs_free_array(qualPtr);

    return qualities;
  } finally {
    Module._mmgs_free(handle);
  }
}

async function computeQuality3D(
  Module: MmgModule,
  mesh: MeshData
): Promise<Float64Array> {
  const nVertices = mesh.vertices.length / 3;
  const nTetrahedra = mesh.tetrahedra ? mesh.tetrahedra.length / 4 : 0;
  const nTriangles = mesh.triangles ? mesh.triangles.length / 3 : 0;

  if (nTetrahedra === 0) return new Float64Array(0);

  const handle = Module._mmg3d_init();
  if (handle < 0) throw new Error("Failed to initialize MMG3D");

  try {
    let result = Module._mmg3d_set_mesh_size(handle, nVertices, nTetrahedra, 0, nTriangles, 0, 0);
    if (result !== 1) throw new Error("Failed to set mesh size");

    const vertPtr = allocFloat64(Module, mesh.vertices);
    result = Module._mmg3d_set_vertices(handle, vertPtr, 0);
    Module._free(vertPtr);
    if (result !== 1) throw new Error("Failed to set vertices");

    if (mesh.tetrahedra) {
      const tetraPtr = allocInt32(Module, mesh.tetrahedra);
      result = Module._mmg3d_set_tetrahedra(handle, tetraPtr, 0);
      Module._free(tetraPtr);
      if (result !== 1) throw new Error("Failed to set tetrahedra");
    }

    if (mesh.triangles && nTriangles > 0) {
      const triPtr = allocInt32(Module, mesh.triangles);
      result = Module._mmg3d_set_triangles(handle, triPtr, 0);
      Module._free(triPtr);
    }

    // Get qualities
    const countPtr = Module._malloc(4);
    const qualPtr = Module._mmg3d_get_tetrahedra_qualities(handle, countPtr);
    const count = Module.getValue(countPtr, "i32");
    Module._free(countPtr);

    if (qualPtr === 0 || count === 0) {
      return new Float64Array(0);
    }

    const qualities = new Float64Array(count);
    qualities.set(Module.HEAPF64.subarray(qualPtr / 8, qualPtr / 8 + count));
    Module._mmg3d_free_array(qualPtr);

    return qualities;
  } finally {
    Module._mmg3d_free(handle);
  }
}
