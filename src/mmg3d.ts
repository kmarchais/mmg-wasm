/**
 * MMG3D TypeScript bindings
 *
 * Provides a type-safe interface to the MMG3D mesh remeshing library.
 * Uses Emscripten's cwrap to call the C wrapper functions.
 */

import type { WasmModule } from "./memory";

/**
 * Integer parameters for MMG3D (matching MMG3D_Param enum in libmmg3d.h)
 */
export const IPARAM = {
  verbose: 0, // [-1..10], Level of verbosity
  mem: 1, // [n/-1], Max memory size in MB or keep the default value
  debug: 2, // [1/0], Turn on/off debug mode
  angle: 3, // [1/0], Turn on/off angle detection
  iso: 4, // [1/0], Enable level-set discretization (volume and surfaces)
  isosurf: 5, // [1/0], Enable level-set discretization on the surfaces only
  nofem: 6, // [1/0], Do not attempt to make the mesh suitable for FEM
  opnbdy: 7, // [1/0], Preserve triangles at interface of 2 domains
  lag: 8, // [-1/0/1/2], Enable Lagrangian motion
  optim: 9, // [1/0], Optimize mesh keeping its initial edge sizes
  optimLES: 10, // [1/0], Strong mesh optimization for LES computations
  noinsert: 11, // [1/0], Avoid/allow vertex insertion
  noswap: 12, // [1/0], Avoid/allow edge or face flipping
  nomove: 13, // [1/0], Avoid/allow vertex relocation
  nosurf: 14, // [1/0], Avoid/allow surface modifications
  nreg: 15, // [0/1], Enable regularization of normals
  xreg: 16, // [0/1], Enable boundary regularization by moving vertices
  numberOfLocalParam: 17, // [n], Number of local parameters
  numberOfLSBaseReferences: 18, // [n], Number of base references for bubble removal
  numberOfMat: 19, // [n], Number of materials in level-set mode
  numsubdomain: 20, // [0/n], Save only the subdomain (reference) n
  renum: 21, // [1/0], Turn on/off renumbering with Scotch
  anisosize: 22, // [1/0], Turn on/off anisotropic metric creation
  octree: 23, // [n], Max number of vertices per PROctree cell
  nosizreq: 24, // [0/1], Allow/avoid overwriting of sizes at required vertices
  isoref: 25, // [0/n], Isosurface boundary material reference
} as const;

/**
 * Double parameters for MMG3D (matching MMG3D_Param enum in libmmg3d.h)
 * Note: These follow the integer parameters in the enum
 */
export const DPARAM = {
  angleDetection: 26, // [val], Value for angle detection (degrees)
  hmin: 27, // [val], Minimal edge length
  hmax: 28, // [val], Maximal edge length
  hsiz: 29, // [val], Constant edge length
  hausd: 30, // [val], Global Hausdorff distance
  hgrad: 31, // [val], Gradation
  hgradreq: 32, // [val], Gradation on required entities
  ls: 33, // [val], Function value where the level set is discretized
  xreg: 34, // [val], Relaxation parameter for boundary regularization
  rmc: 35, // [-1/val], Remove small disconnected components
} as const;

export type IParamKey = keyof typeof IPARAM;
export type DParamKey = keyof typeof DPARAM;

/** Mesh size information */
export interface MeshSize {
  nVertices: number;
  nTetrahedra: number;
  nPrisms: number;
  nTriangles: number;
  nQuads: number;
  nEdges: number;
}

/** MMG3D return codes */
export const MMG_RETURN_CODES = {
  SUCCESS: 0,
  LOWFAILURE: 1, // The mesh is not suitable for remeshing
  STRONGFAILURE: 2, // The mesh is not valid
} as const;

/** Internal module interface (raw Emscripten functions) */
export interface MMG3DModule extends WasmModule {
  _mmg3d_init(): number;
  _mmg3d_free(handle: number): number;
  _mmg3d_get_available_handles(): number;
  _mmg3d_get_max_handles(): number;
  _mmg3d_set_mesh_size(
    handle: number,
    np: number,
    ne: number,
    nprism: number,
    nt: number,
    nquad: number,
    na: number,
  ): number;
  _mmg3d_get_mesh_size(
    handle: number,
    npPtr: number,
    nePtr: number,
    nprismPtr: number,
    ntPtr: number,
    nquadPtr: number,
    naPtr: number,
  ): number;
  _mmg3d_set_vertex(
    handle: number,
    x: number,
    y: number,
    z: number,
    ref: number,
    pos: number,
  ): number;
  _mmg3d_set_vertices(
    handle: number,
    verticesPtr: number,
    refsPtr: number,
  ): number;
  _mmg3d_get_vertices(handle: number, outCountPtr: number): number;
  _mmg3d_set_tetrahedron(
    handle: number,
    v0: number,
    v1: number,
    v2: number,
    v3: number,
    ref: number,
    pos: number,
  ): number;
  _mmg3d_set_tetrahedra(
    handle: number,
    tetraPtr: number,
    refsPtr: number,
  ): number;
  _mmg3d_get_tetrahedra(handle: number, outCountPtr: number): number;
  _mmg3d_set_triangle(
    handle: number,
    v0: number,
    v1: number,
    v2: number,
    ref: number,
    pos: number,
  ): number;
  _mmg3d_set_triangles(
    handle: number,
    triaPtr: number,
    refsPtr: number,
  ): number;
  _mmg3d_get_triangles(handle: number, outCountPtr: number): number;
  _mmg3d_set_iparameter(handle: number, iparam: number, val: number): number;
  _mmg3d_set_dparameter(handle: number, dparam: number, val: number): number;
  _mmg3d_remesh(handle: number): number;
  _mmg3d_free_array(ptr: number): void;
  getValue(ptr: number, type: string): number;
  setValue(ptr: number, value: number, type: string): void;
}

let module: MMG3DModule | null = null;

/**
 * Initialize the MMG3D WASM module.
 * Must be called before using any MMG3D functions.
 */
export async function initMMG3D(): Promise<void> {
  if (module) {
    return; // Already initialized
  }

  // Dynamic import of the Emscripten-generated module
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Emscripten module doesn't have TypeScript declarations
  const createModule = (await import("../build/dist/mmg.js")).default;
  module = (await createModule()) as MMG3DModule;
}

/**
 * Check if the module is initialized and throw if not
 */
function getModule(): MMG3DModule {
  if (!module) {
    throw new Error("MMG3D not initialized. Call initMMG3D() first.");
  }
  return module;
}

/**
 * Get the underlying WASM module for advanced use cases.
 * Useful for memory utilities that need direct heap access.
 *
 * @returns The Emscripten module instance
 * @throws Error if not initialized
 */
export function getWasmModule(): MMG3DModule {
  return getModule();
}

/**
 * MMG3D mesh handle type (opaque integer)
 */
export type MeshHandle = number & { readonly __brand: unique symbol };

/**
 * MMG3D namespace containing all mesh operations
 */
export const MMG3D = {
  /**
   * Create a new MMG3D mesh structure.
   * @returns A mesh handle for use with other MMG3D functions
   * @throws Error if initialization fails or max handles reached
   */
  init(): MeshHandle {
    const m = getModule();
    const handle = m._mmg3d_init();
    if (handle < 0) {
      throw new Error("Failed to initialize MMG3D mesh (max handles reached?)");
    }
    return handle as MeshHandle;
  },

  /**
   * Free a mesh and its associated resources.
   * @param handle - The mesh handle to free
   * @throws Error if the handle is invalid
   */
  free(handle: MeshHandle): void {
    const m = getModule();
    const result = m._mmg3d_free(handle);
    if (result !== 1) {
      throw new Error("Failed to free MMG3D mesh (invalid handle?)");
    }
  },

  /**
   * Get the number of available (free) mesh handle slots.
   * @returns Number of handles that can still be allocated
   */
  getAvailableHandles(): number {
    const m = getModule();
    return m._mmg3d_get_available_handles();
  },

  /**
   * Get the maximum number of concurrent mesh handles supported.
   * @returns Maximum number of handles (currently 64)
   */
  getMaxHandles(): number {
    const m = getModule();
    return m._mmg3d_get_max_handles();
  },

  /**
   * Set the mesh size (allocate memory for mesh entities).
   * @param handle - The mesh handle
   * @param nVertices - Number of vertices
   * @param nTetrahedra - Number of tetrahedra
   * @param nPrisms - Number of prisms (usually 0)
   * @param nTriangles - Number of boundary triangles
   * @param nQuads - Number of quadrilaterals (usually 0)
   * @param nEdges - Number of edges (usually 0)
   * @throws Error if allocation fails
   */
  setMeshSize(
    handle: MeshHandle,
    nVertices: number,
    nTetrahedra: number,
    nPrisms: number,
    nTriangles: number,
    nQuads: number,
    nEdges: number,
  ): void {
    const m = getModule();
    const result = m._mmg3d_set_mesh_size(
      handle,
      nVertices,
      nTetrahedra,
      nPrisms,
      nTriangles,
      nQuads,
      nEdges,
    );
    if (result !== 1) {
      throw new Error("Failed to set mesh size");
    }
  },

  /**
   * Get the current mesh size.
   * @param handle - The mesh handle
   * @returns Object containing mesh dimensions
   */
  getMeshSize(handle: MeshHandle): MeshSize {
    const m = getModule();

    // Allocate space for 6 integers
    const ptr = m._malloc(6 * 4);
    if (ptr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const result = m._mmg3d_get_mesh_size(
        handle,
        ptr, // np
        ptr + 4, // ne
        ptr + 8, // nprism
        ptr + 12, // nt
        ptr + 16, // nquad
        ptr + 20, // na
      );

      if (result !== 1) {
        throw new Error("Failed to get mesh size");
      }

      return {
        nVertices: m.getValue(ptr, "i32"),
        nTetrahedra: m.getValue(ptr + 4, "i32"),
        nPrisms: m.getValue(ptr + 8, "i32"),
        nTriangles: m.getValue(ptr + 12, "i32"),
        nQuads: m.getValue(ptr + 16, "i32"),
        nEdges: m.getValue(ptr + 20, "i32"),
      };
    } finally {
      m._free(ptr);
    }
  },

  /**
   * Set a single vertex.
   * @param handle - The mesh handle
   * @param pos - Vertex position (1-indexed, MMG convention)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @param ref - Reference value (default 0)
   */
  setVertex(
    handle: MeshHandle,
    pos: number,
    x: number,
    y: number,
    z: number,
    ref = 0,
  ): void {
    const m = getModule();
    const result = m._mmg3d_set_vertex(handle, x, y, z, ref, pos);
    if (result !== 1) {
      throw new Error(`Failed to set vertex at position ${pos}`);
    }
  },

  /**
   * Set all vertices at once (bulk operation).
   * @param handle - The mesh handle
   * @param vertices - Float64Array of vertex coordinates [x0, y0, z0, x1, y1, z1, ...]
   * @param refs - Optional Int32Array of reference values (one per vertex)
   */
  setVertices(
    handle: MeshHandle,
    vertices: Float64Array,
    refs?: Int32Array,
  ): void {
    if (vertices.length % 3 !== 0) {
      throw new Error(
        `vertices array length must be a multiple of 3, got ${vertices.length}`,
      );
    }
    const nVertices = vertices.length / 3;
    if (refs && refs.length !== nVertices) {
      throw new Error(
        `refs array length (${refs.length}) must match number of vertices (${nVertices})`,
      );
    }

    const m = getModule();

    // Allocate and copy vertices to WASM heap
    const verticesPtr = m._malloc(vertices.byteLength);
    if (verticesPtr === 0) {
      throw new Error("Failed to allocate memory for vertices");
    }

    let refsPtr = 0;
    try {
      // Copy vertices to WASM heap
      m.HEAPF64.set(vertices, verticesPtr / 8);

      // Handle refs if provided
      if (refs) {
        refsPtr = m._malloc(refs.byteLength);
        if (refsPtr === 0) {
          throw new Error("Failed to allocate memory for refs");
        }
        m.HEAP32.set(refs, refsPtr / 4);
      }

      const result = m._mmg3d_set_vertices(handle, verticesPtr, refsPtr);
      if (result !== 1) {
        throw new Error("Failed to set vertices");
      }
    } finally {
      m._free(verticesPtr);
      if (refsPtr !== 0) {
        m._free(refsPtr);
      }
    }
  },

  /**
   * Get all vertices.
   * @param handle - The mesh handle
   * @returns Float64Array of vertex coordinates [x0, y0, z0, x1, y1, z1, ...]
   */
  getVertices(handle: MeshHandle): Float64Array {
    const m = getModule();

    // Allocate space for output count
    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const dataPtr = m._mmg3d_get_vertices(handle, countPtr);
      if (dataPtr === 0) {
        // Check if there are simply no vertices
        const count = m.getValue(countPtr, "i32");
        if (count === 0) {
          return new Float64Array(0);
        }
        throw new Error("Failed to get vertices");
      }

      try {
        const count = m.getValue(countPtr, "i32");
        // Copy data from WASM heap
        const result = new Float64Array(count * 3);
        result.set(m.HEAPF64.subarray(dataPtr / 8, dataPtr / 8 + count * 3));
        return result;
      } finally {
        m._mmg3d_free_array(dataPtr);
      }
    } finally {
      m._free(countPtr);
    }
  },

  /**
   * Set a single tetrahedron.
   * @param handle - The mesh handle
   * @param pos - Tetrahedron position (1-indexed, MMG convention)
   * @param v0, v1, v2, v3 - Vertex indices (1-indexed)
   * @param ref - Reference value (default 0)
   */
  setTetrahedron(
    handle: MeshHandle,
    pos: number,
    v0: number,
    v1: number,
    v2: number,
    v3: number,
    ref = 0,
  ): void {
    const m = getModule();
    const result = m._mmg3d_set_tetrahedron(handle, v0, v1, v2, v3, ref, pos);
    if (result !== 1) {
      throw new Error(`Failed to set tetrahedron at position ${pos}`);
    }
  },

  /**
   * Set all tetrahedra at once (bulk operation).
   * @param handle - The mesh handle
   * @param tetrahedra - Int32Array of vertex indices [v0_0, v1_0, v2_0, v3_0, ...] (1-indexed)
   * @param refs - Optional Int32Array of reference values (one per tetrahedron)
   */
  setTetrahedra(
    handle: MeshHandle,
    tetrahedra: Int32Array,
    refs?: Int32Array,
  ): void {
    if (tetrahedra.length % 4 !== 0) {
      throw new Error(
        `tetrahedra array length must be a multiple of 4, got ${tetrahedra.length}`,
      );
    }
    const nTetrahedra = tetrahedra.length / 4;
    if (refs && refs.length !== nTetrahedra) {
      throw new Error(
        `refs array length (${refs.length}) must match number of tetrahedra (${nTetrahedra})`,
      );
    }

    const m = getModule();

    // Allocate and copy tetrahedra to WASM heap
    const tetraPtr = m._malloc(tetrahedra.byteLength);
    if (tetraPtr === 0) {
      throw new Error("Failed to allocate memory for tetrahedra");
    }

    let refsPtr = 0;
    try {
      // Copy tetrahedra to WASM heap
      m.HEAP32.set(tetrahedra, tetraPtr / 4);

      // Handle refs if provided
      if (refs) {
        refsPtr = m._malloc(refs.byteLength);
        if (refsPtr === 0) {
          throw new Error("Failed to allocate memory for refs");
        }
        m.HEAP32.set(refs, refsPtr / 4);
      }

      const result = m._mmg3d_set_tetrahedra(handle, tetraPtr, refsPtr);
      if (result !== 1) {
        throw new Error("Failed to set tetrahedra");
      }
    } finally {
      m._free(tetraPtr);
      if (refsPtr !== 0) {
        m._free(refsPtr);
      }
    }
  },

  /**
   * Get all tetrahedra.
   * @param handle - The mesh handle
   * @returns Int32Array of vertex indices [v0_0, v1_0, v2_0, v3_0, ...] (1-indexed)
   */
  getTetrahedra(handle: MeshHandle): Int32Array {
    const m = getModule();

    // Allocate space for output count
    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const dataPtr = m._mmg3d_get_tetrahedra(handle, countPtr);
      if (dataPtr === 0) {
        // Check if there are simply no tetrahedra
        const count = m.getValue(countPtr, "i32");
        if (count === 0) {
          return new Int32Array(0);
        }
        throw new Error("Failed to get tetrahedra");
      }

      try {
        const count = m.getValue(countPtr, "i32");
        // Copy data from WASM heap
        const result = new Int32Array(count * 4);
        result.set(m.HEAP32.subarray(dataPtr / 4, dataPtr / 4 + count * 4));
        return result;
      } finally {
        m._mmg3d_free_array(dataPtr);
      }
    } finally {
      m._free(countPtr);
    }
  },

  /**
   * Set a single triangle.
   * @param handle - The mesh handle
   * @param pos - Triangle position (1-indexed, MMG convention)
   * @param v0, v1, v2 - Vertex indices (1-indexed)
   * @param ref - Reference value (default 0)
   */
  setTriangle(
    handle: MeshHandle,
    pos: number,
    v0: number,
    v1: number,
    v2: number,
    ref = 0,
  ): void {
    const m = getModule();
    const result = m._mmg3d_set_triangle(handle, v0, v1, v2, ref, pos);
    if (result !== 1) {
      throw new Error(`Failed to set triangle at position ${pos}`);
    }
  },

  /**
   * Set all triangles at once (bulk operation).
   * @param handle - The mesh handle
   * @param triangles - Int32Array of vertex indices [v0_0, v1_0, v2_0, ...] (1-indexed)
   * @param refs - Optional Int32Array of reference values (one per triangle)
   */
  setTriangles(
    handle: MeshHandle,
    triangles: Int32Array,
    refs?: Int32Array,
  ): void {
    if (triangles.length % 3 !== 0) {
      throw new Error(
        `triangles array length must be a multiple of 3, got ${triangles.length}`,
      );
    }
    const nTriangles = triangles.length / 3;
    if (refs && refs.length !== nTriangles) {
      throw new Error(
        `refs array length (${refs.length}) must match number of triangles (${nTriangles})`,
      );
    }

    const m = getModule();

    // Allocate and copy triangles to WASM heap
    const triaPtr = m._malloc(triangles.byteLength);
    if (triaPtr === 0) {
      throw new Error("Failed to allocate memory for triangles");
    }

    let refsPtr = 0;
    try {
      // Copy triangles to WASM heap
      m.HEAP32.set(triangles, triaPtr / 4);

      // Handle refs if provided
      if (refs) {
        refsPtr = m._malloc(refs.byteLength);
        if (refsPtr === 0) {
          throw new Error("Failed to allocate memory for refs");
        }
        m.HEAP32.set(refs, refsPtr / 4);
      }

      const result = m._mmg3d_set_triangles(handle, triaPtr, refsPtr);
      if (result !== 1) {
        throw new Error("Failed to set triangles");
      }
    } finally {
      m._free(triaPtr);
      if (refsPtr !== 0) {
        m._free(refsPtr);
      }
    }
  },

  /**
   * Get all triangles.
   * @param handle - The mesh handle
   * @returns Int32Array of vertex indices [v0_0, v1_0, v2_0, ...] (1-indexed)
   */
  getTriangles(handle: MeshHandle): Int32Array {
    const m = getModule();

    // Allocate space for output count
    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const dataPtr = m._mmg3d_get_triangles(handle, countPtr);
      if (dataPtr === 0) {
        // Check if there are simply no triangles
        const count = m.getValue(countPtr, "i32");
        if (count === 0) {
          return new Int32Array(0);
        }
        throw new Error("Failed to get triangles");
      }

      try {
        const count = m.getValue(countPtr, "i32");
        // Copy data from WASM heap
        const result = new Int32Array(count * 3);
        result.set(m.HEAP32.subarray(dataPtr / 4, dataPtr / 4 + count * 3));
        return result;
      } finally {
        m._mmg3d_free_array(dataPtr);
      }
    } finally {
      m._free(countPtr);
    }
  },

  /**
   * Set an integer parameter.
   * @param handle - The mesh handle
   * @param param - Parameter key from IPARAM
   * @param value - Parameter value
   */
  setIParam(handle: MeshHandle, param: number, value: number): void {
    const m = getModule();
    const result = m._mmg3d_set_iparameter(handle, param, value);
    if (result !== 1) {
      throw new Error(`Failed to set integer parameter ${param}`);
    }
  },

  /**
   * Set a double parameter.
   * @param handle - The mesh handle
   * @param param - Parameter key from DPARAM
   * @param value - Parameter value
   */
  setDParam(handle: MeshHandle, param: number, value: number): void {
    const m = getModule();
    const result = m._mmg3d_set_dparameter(handle, param, value);
    if (result !== 1) {
      throw new Error(`Failed to set double parameter ${param}`);
    }
  },

  /**
   * Run the MMG3D remeshing algorithm.
   * @param handle - The mesh handle
   * @returns Return code (0 = success, 1 = low failure, 2 = strong failure)
   */
  mmg3dlib(handle: MeshHandle): number {
    const m = getModule();
    return m._mmg3d_remesh(handle);
  },
};
