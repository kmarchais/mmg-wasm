/**
 * MMGS TypeScript bindings
 *
 * Provides a type-safe interface to the MMGS surface mesh remeshing library.
 * Uses Emscripten's cwrap to call the C wrapper functions.
 *
 * MMGS handles 3D surface meshes (triangulated surfaces embedded in 3D space).
 * Unlike MMG3D, it has no tetrahedra. Unlike MMG2D, it has 3D vertices.
 */

import type { EmscriptenFS } from "./fs";
import type { WasmModule } from "./memory";

/**
 * Integer parameters for MMGS (matching MMGS_Param enum in libmmgs.h)
 */
export const IPARAM_S = {
  verbose: 0, // [-1..10], Level of verbosity
  mem: 1, // [n/-1], Max memory size in MB or keep the default value
  debug: 2, // [1/0], Turn on/off debug mode
  angle: 3, // [1/0], Turn on/off angle detection
  iso: 4, // [1/0], Enable level-set discretization
  isosurf: 5, // [1/0], Enable level-set discretization on surface only
  isoref: 6, // [0/n], Iso-surface boundary material reference
  keepRef: 7, // [1/0], Preserve initial domain references in level-set mode
  optim: 8, // [1/0], Optimize mesh keeping its initial edge sizes
  noinsert: 9, // [1/0], Avoid/allow vertex insertion
  noswap: 10, // [1/0], Avoid/allow edge or face flipping
  nomove: 11, // [1/0], Avoid/allow vertex relocation
  nreg: 12, // [0/1], Disable/enable regularization of normals
  xreg: 13, // [0/1], Disable/enable regularization by moving vertices
  numberOfLocalParam: 14, // [n], Number of local parameters
  numberOfLSBaseReferences: 15, // [n], Number of base references for bubble removal
  numberOfMat: 16, // [n], Number of materials in level-set mode
  numsubdomain: 17, // [0/n], Save only subdomain n (0==all subdomains)
  renum: 18, // [1/0], Turn on/off renumbering with Scotch
  anisosize: 19, // [1/0], Turn on/off anisotropic metric creation
  nosizreq: 20, // [0/1], Allow/avoid overwriting of sizes at required vertices
} as const;

/**
 * Double parameters for MMGS (matching MMGS_Param enum in libmmgs.h)
 * Note: These follow the integer parameters in the enum
 */
export const DPARAM_S = {
  angleDetection: 21, // [val], Threshold for angle detection (degrees)
  hmin: 22, // [val], Minimal edge length
  hmax: 23, // [val], Maximal edge length
  hsiz: 24, // [val], Constant edge length
  hausd: 25, // [val], Global Hausdorff distance
  hgrad: 26, // [val], Gradation
  hgradreq: 27, // [val], Gradation on required entities
  ls: 28, // [val], Level-set discretization value
  xreg: 29, // [val], Relaxation parameter for coordinate regularization
  rmc: 30, // [-1/val], Remove small disconnected components
} as const;

export type IParamKeyS = keyof typeof IPARAM_S;
export type DParamKeyS = keyof typeof DPARAM_S;

/** Mesh size information for surface meshes */
export interface MeshSizeS {
  nVertices: number;
  nTriangles: number;
  nEdges: number;
}

/** MMGS return codes */
export const MMG_RETURN_CODES_S = {
  SUCCESS: 0,
  LOWFAILURE: 1, // The mesh is not suitable for remeshing
  STRONGFAILURE: 2, // The mesh is not valid
} as const;

/** Internal module interface (raw Emscripten functions) */
export interface MMGSModule extends WasmModule {
  _mmgs_init(): number;
  _mmgs_free(handle: number): number;
  _mmgs_get_available_handles(): number;
  _mmgs_get_max_handles(): number;
  _mmgs_set_mesh_size(
    handle: number,
    np: number,
    nt: number,
    na: number,
  ): number;
  _mmgs_get_mesh_size(
    handle: number,
    npPtr: number,
    ntPtr: number,
    naPtr: number,
  ): number;
  _mmgs_set_vertex(
    handle: number,
    x: number,
    y: number,
    z: number,
    ref: number,
    pos: number,
  ): number;
  _mmgs_set_vertices(
    handle: number,
    verticesPtr: number,
    refsPtr: number,
  ): number;
  _mmgs_get_vertices(handle: number, outCountPtr: number): number;
  _mmgs_set_triangle(
    handle: number,
    v0: number,
    v1: number,
    v2: number,
    ref: number,
    pos: number,
  ): number;
  _mmgs_set_triangles(handle: number, triaPtr: number, refsPtr: number): number;
  _mmgs_get_triangles(handle: number, outCountPtr: number): number;
  _mmgs_set_edge(
    handle: number,
    v0: number,
    v1: number,
    ref: number,
    pos: number,
  ): number;
  _mmgs_set_edges(handle: number, edgesPtr: number, refsPtr: number): number;
  _mmgs_get_edges(handle: number, outCountPtr: number): number;
  _mmgs_set_iparameter(handle: number, iparam: number, val: number): number;
  _mmgs_set_dparameter(handle: number, dparam: number, val: number): number;
  _mmgs_remesh(handle: number): number;
  _mmgs_free_array(ptr: number): void;
  _mmgs_load_mesh(handle: number, filenamePtr: number): number;
  _mmgs_save_mesh(handle: number, filenamePtr: number): number;
  _mmgs_load_sol(handle: number, filenamePtr: number): number;
  _mmgs_save_sol(handle: number, filenamePtr: number): number;
  getValue(ptr: number, type: string): number;
  setValue(ptr: number, value: number, type: string): void;
  lengthBytesUTF8(str: string): number;
  stringToUTF8(str: string, ptr: number, maxBytes: number): void;
  FS: EmscriptenFS;
}

let module: MMGSModule | null = null;

/**
 * Initialize the MMGS WASM module.
 * Must be called before using any MMGS functions.
 */
export async function initMMGS(): Promise<void> {
  if (module) {
    return; // Already initialized
  }

  // Dynamic import of the Emscripten-generated module
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Emscripten module doesn't have TypeScript declarations
  const createModule = (await import("../build/dist/mmg.js")).default;
  // @ts-expect-error - Emscripten module doesn't have typed exports
  module = (await createModule()) as MMGSModule;
}

/**
 * Check if the module is initialized and throw if not
 */
function getModule(): MMGSModule {
  if (!module) {
    throw new Error("MMGS not initialized. Call initMMGS() first.");
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
export function getWasmModuleS(): MMGSModule {
  return getModule();
}

/**
 * MMGS mesh handle type (opaque integer)
 */
export type MeshHandleS = number & { readonly __brand: unique symbol };

/**
 * MMGS namespace containing all mesh operations
 */
export const MMGS = {
  /**
   * Create a new MMGS mesh structure.
   * @returns A mesh handle for use with other MMGS functions
   * @throws Error if initialization fails or max handles reached
   */
  init(): MeshHandleS {
    const m = getModule();
    const handle = m._mmgs_init();
    if (handle < 0) {
      throw new Error("Failed to initialize MMGS mesh (max handles reached?)");
    }
    return handle as MeshHandleS;
  },

  /**
   * Free a mesh and its associated resources.
   * @param handle - The mesh handle to free
   * @throws Error if the handle is invalid
   */
  free(handle: MeshHandleS): void {
    const m = getModule();
    const result = m._mmgs_free(handle);
    if (result !== 1) {
      throw new Error("Failed to free MMGS mesh (invalid handle?)");
    }
  },

  /**
   * Get the number of available (free) mesh handle slots.
   * @returns Number of handles that can still be allocated
   */
  getAvailableHandles(): number {
    const m = getModule();
    return m._mmgs_get_available_handles();
  },

  /**
   * Get the maximum number of concurrent mesh handles supported.
   * @returns Maximum number of handles (currently 64)
   */
  getMaxHandles(): number {
    const m = getModule();
    return m._mmgs_get_max_handles();
  },

  /**
   * Set the mesh size (allocate memory for mesh entities).
   * @param handle - The mesh handle
   * @param nVertices - Number of vertices
   * @param nTriangles - Number of triangles
   * @param nEdges - Number of boundary edges
   * @throws Error if allocation fails
   */
  setMeshSize(
    handle: MeshHandleS,
    nVertices: number,
    nTriangles: number,
    nEdges: number,
  ): void {
    const m = getModule();
    const result = m._mmgs_set_mesh_size(handle, nVertices, nTriangles, nEdges);
    if (result !== 1) {
      throw new Error("Failed to set mesh size");
    }
  },

  /**
   * Get the current mesh size.
   * @param handle - The mesh handle
   * @returns Object containing mesh dimensions
   */
  getMeshSize(handle: MeshHandleS): MeshSizeS {
    const m = getModule();

    // Allocate space for 3 integers
    const ptr = m._malloc(3 * 4);
    if (ptr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const result = m._mmgs_get_mesh_size(
        handle,
        ptr, // np
        ptr + 4, // nt
        ptr + 8, // na
      );

      if (result !== 1) {
        throw new Error("Failed to get mesh size");
      }

      return {
        nVertices: m.getValue(ptr, "i32"),
        nTriangles: m.getValue(ptr + 4, "i32"),
        nEdges: m.getValue(ptr + 8, "i32"),
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
    handle: MeshHandleS,
    pos: number,
    x: number,
    y: number,
    z: number,
    ref = 0,
  ): void {
    const m = getModule();
    const result = m._mmgs_set_vertex(handle, x, y, z, ref, pos);
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
    handle: MeshHandleS,
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

      const result = m._mmgs_set_vertices(handle, verticesPtr, refsPtr);
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
  getVertices(handle: MeshHandleS): Float64Array {
    const m = getModule();

    // Allocate space for output count
    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const dataPtr = m._mmgs_get_vertices(handle, countPtr);
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
        // Copy data from WASM heap (3D: 3 coords per vertex)
        const result = new Float64Array(count * 3);
        result.set(m.HEAPF64.subarray(dataPtr / 8, dataPtr / 8 + count * 3));
        return result;
      } finally {
        m._mmgs_free_array(dataPtr);
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
    handle: MeshHandleS,
    pos: number,
    v0: number,
    v1: number,
    v2: number,
    ref = 0,
  ): void {
    const m = getModule();
    const result = m._mmgs_set_triangle(handle, v0, v1, v2, ref, pos);
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
    handle: MeshHandleS,
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

      const result = m._mmgs_set_triangles(handle, triaPtr, refsPtr);
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
  getTriangles(handle: MeshHandleS): Int32Array {
    const m = getModule();

    // Allocate space for output count
    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const dataPtr = m._mmgs_get_triangles(handle, countPtr);
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
        m._mmgs_free_array(dataPtr);
      }
    } finally {
      m._free(countPtr);
    }
  },

  /**
   * Set a single edge.
   * @param handle - The mesh handle
   * @param pos - Edge position (1-indexed, MMG convention)
   * @param v0, v1 - Vertex indices (1-indexed)
   * @param ref - Reference value (default 0)
   */
  setEdge(
    handle: MeshHandleS,
    pos: number,
    v0: number,
    v1: number,
    ref = 0,
  ): void {
    const m = getModule();
    const result = m._mmgs_set_edge(handle, v0, v1, ref, pos);
    if (result !== 1) {
      throw new Error(`Failed to set edge at position ${pos}`);
    }
  },

  /**
   * Set all edges at once (bulk operation).
   * @param handle - The mesh handle
   * @param edges - Int32Array of vertex indices [v0_0, v1_0, v0_1, v1_1, ...] (1-indexed)
   * @param refs - Optional Int32Array of reference values (one per edge)
   */
  setEdges(handle: MeshHandleS, edges: Int32Array, refs?: Int32Array): void {
    if (edges.length % 2 !== 0) {
      throw new Error(
        `edges array length must be a multiple of 2, got ${edges.length}`,
      );
    }
    const nEdges = edges.length / 2;
    if (refs && refs.length !== nEdges) {
      throw new Error(
        `refs array length (${refs.length}) must match number of edges (${nEdges})`,
      );
    }

    const m = getModule();

    // Allocate and copy edges to WASM heap
    const edgesPtr = m._malloc(edges.byteLength);
    if (edgesPtr === 0) {
      throw new Error("Failed to allocate memory for edges");
    }

    let refsPtr = 0;
    try {
      // Copy edges to WASM heap
      m.HEAP32.set(edges, edgesPtr / 4);

      // Handle refs if provided
      if (refs) {
        refsPtr = m._malloc(refs.byteLength);
        if (refsPtr === 0) {
          throw new Error("Failed to allocate memory for refs");
        }
        m.HEAP32.set(refs, refsPtr / 4);
      }

      const result = m._mmgs_set_edges(handle, edgesPtr, refsPtr);
      if (result !== 1) {
        throw new Error("Failed to set edges");
      }
    } finally {
      m._free(edgesPtr);
      if (refsPtr !== 0) {
        m._free(refsPtr);
      }
    }
  },

  /**
   * Get all edges.
   * @param handle - The mesh handle
   * @returns Int32Array of vertex indices [v0_0, v1_0, ...] (1-indexed)
   */
  getEdges(handle: MeshHandleS): Int32Array {
    const m = getModule();

    // Allocate space for output count
    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const dataPtr = m._mmgs_get_edges(handle, countPtr);
      if (dataPtr === 0) {
        // Check if there are simply no edges
        const count = m.getValue(countPtr, "i32");
        if (count === 0) {
          return new Int32Array(0);
        }
        throw new Error("Failed to get edges");
      }

      try {
        const count = m.getValue(countPtr, "i32");
        // Copy data from WASM heap (2 vertices per edge)
        const result = new Int32Array(count * 2);
        result.set(m.HEAP32.subarray(dataPtr / 4, dataPtr / 4 + count * 2));
        return result;
      } finally {
        m._mmgs_free_array(dataPtr);
      }
    } finally {
      m._free(countPtr);
    }
  },

  /**
   * Set an integer parameter.
   * @param handle - The mesh handle
   * @param param - Parameter key from IPARAM_S
   * @param value - Parameter value
   */
  setIParam(handle: MeshHandleS, param: number, value: number): void {
    const m = getModule();
    const result = m._mmgs_set_iparameter(handle, param, value);
    if (result !== 1) {
      throw new Error(`Failed to set integer parameter ${param}`);
    }
  },

  /**
   * Set a double parameter.
   * @param handle - The mesh handle
   * @param param - Parameter key from DPARAM_S
   * @param value - Parameter value
   */
  setDParam(handle: MeshHandleS, param: number, value: number): void {
    const m = getModule();
    const result = m._mmgs_set_dparameter(handle, param, value);
    if (result !== 1) {
      throw new Error(`Failed to set double parameter ${param}`);
    }
  },

  /**
   * Run the MMGS remeshing algorithm.
   * @param handle - The mesh handle
   * @returns Return code (0 = success, 1 = low failure, 2 = strong failure)
   */
  mmgslib(handle: MeshHandleS): number {
    const m = getModule();
    return m._mmgs_remesh(handle);
  },

  /**
   * Load a mesh from a file in the virtual filesystem.
   * Use FS.writeFile() to write mesh data to the virtual filesystem first.
   * @param handle - The mesh handle
   * @param filename - Path to the mesh file in the virtual filesystem
   * @throws Error if loading fails
   */
  loadMesh(handle: MeshHandleS, filename: string): void {
    const m = getModule();
    const filenameLen = m.lengthBytesUTF8(filename) + 1;
    const filenamePtr = m._malloc(filenameLen);
    if (filenamePtr === 0) {
      throw new Error("Failed to allocate memory for filename");
    }
    try {
      m.stringToUTF8(filename, filenamePtr, filenameLen);
      const result = m._mmgs_load_mesh(handle, filenamePtr);
      if (result !== 1) {
        throw new Error(`Failed to load mesh from ${filename}`);
      }
    } finally {
      m._free(filenamePtr);
    }
  },

  /**
   * Save a mesh to a file in the virtual filesystem.
   * Use FS.readFile() to retrieve the file data after saving.
   * @param handle - The mesh handle
   * @param filename - Path to save the mesh file in the virtual filesystem
   * @throws Error if saving fails
   */
  saveMesh(handle: MeshHandleS, filename: string): void {
    const m = getModule();
    const filenameLen = m.lengthBytesUTF8(filename) + 1;
    const filenamePtr = m._malloc(filenameLen);
    if (filenamePtr === 0) {
      throw new Error("Failed to allocate memory for filename");
    }
    try {
      m.stringToUTF8(filename, filenamePtr, filenameLen);
      const result = m._mmgs_save_mesh(handle, filenamePtr);
      if (result !== 1) {
        throw new Error(`Failed to save mesh to ${filename}`);
      }
    } finally {
      m._free(filenamePtr);
    }
  },

  /**
   * Load a solution from a file in the virtual filesystem.
   * Use FS.writeFile() to write solution data to the virtual filesystem first.
   * @param handle - The mesh handle
   * @param filename - Path to the solution file in the virtual filesystem
   * @throws Error if loading fails
   */
  loadSol(handle: MeshHandleS, filename: string): void {
    const m = getModule();
    const filenameLen = m.lengthBytesUTF8(filename) + 1;
    const filenamePtr = m._malloc(filenameLen);
    if (filenamePtr === 0) {
      throw new Error("Failed to allocate memory for filename");
    }
    try {
      m.stringToUTF8(filename, filenamePtr, filenameLen);
      const result = m._mmgs_load_sol(handle, filenamePtr);
      if (result !== 1) {
        throw new Error(`Failed to load solution from ${filename}`);
      }
    } finally {
      m._free(filenamePtr);
    }
  },

  /**
   * Save a solution to a file in the virtual filesystem.
   * Use FS.readFile() to retrieve the file data after saving.
   * @param handle - The mesh handle
   * @param filename - Path to save the solution file in the virtual filesystem
   * @throws Error if saving fails
   */
  saveSol(handle: MeshHandleS, filename: string): void {
    const m = getModule();
    const filenameLen = m.lengthBytesUTF8(filename) + 1;
    const filenamePtr = m._malloc(filenameLen);
    if (filenamePtr === 0) {
      throw new Error("Failed to allocate memory for filename");
    }
    try {
      m.stringToUTF8(filename, filenamePtr, filenameLen);
      const result = m._mmgs_save_sol(handle, filenamePtr);
      if (result !== 1) {
        throw new Error(`Failed to save solution to ${filename}`);
      }
    } finally {
      m._free(filenamePtr);
    }
  },
};

/**
 * Get the Emscripten virtual filesystem interface.
 * Use this to read/write mesh files to the virtual filesystem.
 *
 * @returns The Emscripten FS interface
 * @throws Error if module not initialized
 */
export function getFSS(): EmscriptenFS {
  const m = getModule();
  return m.FS;
}
