/**
 * MMG2D TypeScript bindings
 *
 * Provides a type-safe interface to the MMG2D mesh remeshing library.
 * Uses Emscripten's cwrap to call the C wrapper functions.
 */

import type { EmscriptenFS } from "./fs";
import type { WasmModule } from "./memory";

/**
 * Integer parameters for MMG2D (matching MMG2D_Param enum in libmmg2d.h)
 */
export const IPARAM_2D = {
  verbose: 0, // [-1..10], Level of verbosity
  mem: 1, // [n/-1], Max memory size in MB or keep the default value
  debug: 2, // [1/0], Turn on/off debug mode
  angle: 3, // [1/0], Turn on/off angle detection
  iso: 4, // [1/0], Enable level-set discretization
  isosurf: 5, // [1/0], Enable level-set discretization on surface only
  opnbdy: 6, // [1/0], Preserve edges at interface of 2 domains
  lag: 7, // [-1/0/1/2], Enable Lagrangian motion
  medit3d: 8, // [0/1/2], Read/write 2D mesh in 3D (Medit only)
  optim: 9, // [1/0], Optimize mesh keeping its initial edge sizes
  noinsert: 10, // [1/0], Avoid/allow vertex insertion
  noswap: 11, // [1/0], Avoid/allow edge or face flipping
  nomove: 12, // [1/0], Avoid/allow vertex relocation
  nosurf: 13, // [1/0], Avoid/allow surface modifications
  nreg: 14, // [0/1], Enable normal regularization
  xreg: 15, // [0/1], Enable regularization by moving vertices
  numsubdomain: 16, // [0/n], Save only the subdomain n
  numberOfLocalParam: 17, // [n], Number of local parameters
  numberOfLSBaseReferences: 18, // [n], Number of base references for bubble removal
  numberOfMat: 19, // [n], Number of materials in level-set mode
  anisosize: 20, // [1/0], Turn on/off anisotropic metric creation
  nosizreq: 21, // [0/1], Allow/avoid overwriting of sizes at required vertices
} as const;

/**
 * Double parameters for MMG2D (matching MMG2D_Param enum in libmmg2d.h)
 * Note: These follow the integer parameters in the enum
 */
export const DPARAM_2D = {
  angleDetection: 22, // [val], Threshold for angle detection (degrees)
  hmin: 23, // [val], Minimal edge length
  hmax: 24, // [val], Maximal edge length
  hsiz: 25, // [val], Constant edge length
  hausd: 26, // [val], Global Hausdorff distance
  hgrad: 27, // [val], Gradation
  hgradreq: 28, // [val], Gradation on required entities
  ls: 29, // [val], Level-set discretization value
  xreg: 30, // [val], Relaxation parameter for coordinate regularization
  rmc: 31, // [-1/val], Remove small disconnected components
} as const;

export type IParamKey2D = keyof typeof IPARAM_2D;
export type DParamKey2D = keyof typeof DPARAM_2D;

/** Mesh size information for 2D meshes */
export interface MeshSize2D {
  nVertices: number;
  nTriangles: number;
  nQuads: number;
  nEdges: number;
}

/** MMG2D return codes */
export const MMG_RETURN_CODES_2D = {
  SUCCESS: 0,
  LOWFAILURE: 1, // The mesh is not suitable for remeshing
  STRONGFAILURE: 2, // The mesh is not valid
} as const;

/**
 * Solution entity types (matching MMG5_entities enum)
 * Specifies where solution values are defined
 */
export const SOL_ENTITY_2D = {
  VERTEX: 1, // MMG5_Vertex - solution defined at vertices
} as const;

/**
 * Solution types (matching MMG5_type enum)
 * Specifies the type of solution data
 */
export const SOL_TYPE_2D = {
  SCALAR: 1, // MMG5_Scalar - one value per entity (isotropic metric)
  VECTOR: 2, // MMG5_Vector - 2 values per entity (2D vector field)
  TENSOR: 3, // MMG5_Tensor - 3 values per entity in 2D (anisotropic metric)
} as const;

/** Solution size information */
export interface SolInfo2D {
  typEntity: number;
  nEntities: number;
  typSol: number;
}

/** Internal module interface (raw Emscripten functions) */
export interface MMG2DModule extends WasmModule {
  _mmg2d_init(): number;
  _mmg2d_free(handle: number): number;
  _mmg2d_get_available_handles(): number;
  _mmg2d_get_max_handles(): number;
  _mmg2d_set_mesh_size(
    handle: number,
    np: number,
    nt: number,
    nquad: number,
    na: number,
  ): number;
  _mmg2d_get_mesh_size(
    handle: number,
    npPtr: number,
    ntPtr: number,
    nquadPtr: number,
    naPtr: number,
  ): number;
  _mmg2d_set_vertex(
    handle: number,
    x: number,
    y: number,
    ref: number,
    pos: number,
  ): number;
  _mmg2d_set_vertices(
    handle: number,
    verticesPtr: number,
    refsPtr: number,
  ): number;
  _mmg2d_get_vertices(handle: number, outCountPtr: number): number;
  _mmg2d_set_triangle(
    handle: number,
    v0: number,
    v1: number,
    v2: number,
    ref: number,
    pos: number,
  ): number;
  _mmg2d_set_triangles(
    handle: number,
    triaPtr: number,
    refsPtr: number,
  ): number;
  _mmg2d_get_triangles(handle: number, outCountPtr: number): number;
  _mmg2d_set_edge(
    handle: number,
    v0: number,
    v1: number,
    ref: number,
    pos: number,
  ): number;
  _mmg2d_set_edges(handle: number, edgesPtr: number, refsPtr: number): number;
  _mmg2d_get_edges(handle: number, outCountPtr: number): number;
  _mmg2d_set_iparameter(handle: number, iparam: number, val: number): number;
  _mmg2d_set_dparameter(handle: number, dparam: number, val: number): number;
  _mmg2d_set_sol_size(
    handle: number,
    typEntity: number,
    np: number,
    typSol: number,
  ): number;
  _mmg2d_get_sol_size(
    handle: number,
    typEntityPtr: number,
    npPtr: number,
    typSolPtr: number,
  ): number;
  _mmg2d_set_scalar_sols(handle: number, valuesPtr: number): number;
  _mmg2d_get_scalar_sols(handle: number, outCountPtr: number): number;
  _mmg2d_set_tensor_sols(handle: number, valuesPtr: number): number;
  _mmg2d_get_tensor_sols(handle: number, outCountPtr: number): number;
  _mmg2d_remesh(handle: number): number;
  _mmg2d_free_array(ptr: number): void;
  _mmg2d_load_mesh(handle: number, filenamePtr: number): number;
  _mmg2d_save_mesh(handle: number, filenamePtr: number): number;
  _mmg2d_load_sol(handle: number, filenamePtr: number): number;
  _mmg2d_save_sol(handle: number, filenamePtr: number): number;
  _mmg2d_get_triangle_quality(handle: number, k: number): number;
  _mmg2d_get_triangles_qualities(handle: number, outCountPtr: number): number;
  getValue(ptr: number, type: string): number;
  setValue(ptr: number, value: number, type: string): void;
  lengthBytesUTF8(str: string): number;
  stringToUTF8(str: string, ptr: number, maxBytes: number): void;
  FS: EmscriptenFS;
}

let module: MMG2DModule | null = null;

/**
 * Initialize the MMG2D WASM module.
 * Must be called before using any MMG2D functions.
 */
export async function initMMG2D(): Promise<void> {
  if (module) {
    return; // Already initialized
  }

  // Dynamic import of the Emscripten-generated module
  // The Emscripten-generated module doesn't have TypeScript declarations,
  // so we cast through unknown to the properly typed interface
  const createModule = (await import("../build/dist/mmg.js")).default;
  module = (await createModule()) as unknown as MMG2DModule;
}

/**
 * Check if the module is initialized and throw if not
 */
function getModule(): MMG2DModule {
  if (!module) {
    throw new Error("MMG2D not initialized. Call initMMG2D() first.");
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
export function getWasmModule2D(): MMG2DModule {
  return getModule();
}

/**
 * MMG2D mesh handle type (opaque integer)
 */
export type MeshHandle2D = number & { readonly __brand: unique symbol };

/**
 * MMG2D namespace containing all mesh operations
 */
export const MMG2D = {
  /**
   * Create a new MMG2D mesh structure.
   * @returns A mesh handle for use with other MMG2D functions
   * @throws Error if initialization fails or max handles reached
   */
  init(): MeshHandle2D {
    const m = getModule();
    const handle = m._mmg2d_init();
    if (handle < 0) {
      throw new Error("Failed to initialize MMG2D mesh (max handles reached?)");
    }
    return handle as MeshHandle2D;
  },

  /**
   * Free a mesh and its associated resources.
   * @param handle - The mesh handle to free
   * @throws Error if the handle is invalid
   */
  free(handle: MeshHandle2D): void {
    const m = getModule();
    const result = m._mmg2d_free(handle);
    if (result !== 1) {
      throw new Error("Failed to free MMG2D mesh (invalid handle?)");
    }
  },

  /**
   * Get the number of available (free) mesh handle slots.
   * @returns Number of handles that can still be allocated
   */
  getAvailableHandles(): number {
    const m = getModule();
    return m._mmg2d_get_available_handles();
  },

  /**
   * Get the maximum number of concurrent mesh handles supported.
   * @returns Maximum number of handles (currently 64)
   */
  getMaxHandles(): number {
    const m = getModule();
    return m._mmg2d_get_max_handles();
  },

  /**
   * Set the mesh size (allocate memory for mesh entities).
   * @param handle - The mesh handle
   * @param nVertices - Number of vertices
   * @param nTriangles - Number of triangles
   * @param nQuads - Number of quadrilaterals (usually 0)
   * @param nEdges - Number of boundary edges
   * @throws Error if allocation fails
   */
  setMeshSize(
    handle: MeshHandle2D,
    nVertices: number,
    nTriangles: number,
    nQuads: number,
    nEdges: number,
  ): void {
    const m = getModule();
    const result = m._mmg2d_set_mesh_size(
      handle,
      nVertices,
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
  getMeshSize(handle: MeshHandle2D): MeshSize2D {
    const m = getModule();

    // Allocate space for 4 integers
    const ptr = m._malloc(4 * 4);
    if (ptr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const result = m._mmg2d_get_mesh_size(
        handle,
        ptr, // np
        ptr + 4, // nt
        ptr + 8, // nquad
        ptr + 12, // na
      );

      if (result !== 1) {
        throw new Error("Failed to get mesh size");
      }

      return {
        nVertices: m.getValue(ptr, "i32"),
        nTriangles: m.getValue(ptr + 4, "i32"),
        nQuads: m.getValue(ptr + 8, "i32"),
        nEdges: m.getValue(ptr + 12, "i32"),
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
   * @param ref - Reference value (default 0)
   */
  setVertex(
    handle: MeshHandle2D,
    pos: number,
    x: number,
    y: number,
    ref = 0,
  ): void {
    const m = getModule();
    const result = m._mmg2d_set_vertex(handle, x, y, ref, pos);
    if (result !== 1) {
      throw new Error(`Failed to set vertex at position ${pos}`);
    }
  },

  /**
   * Set all vertices at once (bulk operation).
   * @param handle - The mesh handle
   * @param vertices - Float64Array of vertex coordinates [x0, y0, x1, y1, ...]
   * @param refs - Optional Int32Array of reference values (one per vertex)
   */
  setVertices(
    handle: MeshHandle2D,
    vertices: Float64Array,
    refs?: Int32Array,
  ): void {
    if (vertices.length % 2 !== 0) {
      throw new Error(
        `vertices array length must be a multiple of 2, got ${vertices.length}`,
      );
    }
    const nVertices = vertices.length / 2;
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

      const result = m._mmg2d_set_vertices(handle, verticesPtr, refsPtr);
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
   * @returns Float64Array of vertex coordinates [x0, y0, x1, y1, ...]
   */
  getVertices(handle: MeshHandle2D): Float64Array {
    const m = getModule();

    // Allocate space for output count
    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const dataPtr = m._mmg2d_get_vertices(handle, countPtr);
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
        // Copy data from WASM heap (2D: 2 coords per vertex)
        const result = new Float64Array(count * 2);
        result.set(m.HEAPF64.subarray(dataPtr / 8, dataPtr / 8 + count * 2));
        return result;
      } finally {
        m._mmg2d_free_array(dataPtr);
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
    handle: MeshHandle2D,
    pos: number,
    v0: number,
    v1: number,
    v2: number,
    ref = 0,
  ): void {
    const m = getModule();
    const result = m._mmg2d_set_triangle(handle, v0, v1, v2, ref, pos);
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
    handle: MeshHandle2D,
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

      const result = m._mmg2d_set_triangles(handle, triaPtr, refsPtr);
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
  getTriangles(handle: MeshHandle2D): Int32Array {
    const m = getModule();

    // Allocate space for output count
    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const dataPtr = m._mmg2d_get_triangles(handle, countPtr);
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
        m._mmg2d_free_array(dataPtr);
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
    handle: MeshHandle2D,
    pos: number,
    v0: number,
    v1: number,
    ref = 0,
  ): void {
    const m = getModule();
    const result = m._mmg2d_set_edge(handle, v0, v1, ref, pos);
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
  setEdges(handle: MeshHandle2D, edges: Int32Array, refs?: Int32Array): void {
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

      const result = m._mmg2d_set_edges(handle, edgesPtr, refsPtr);
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
  getEdges(handle: MeshHandle2D): Int32Array {
    const m = getModule();

    // Allocate space for output count
    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const dataPtr = m._mmg2d_get_edges(handle, countPtr);
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
        m._mmg2d_free_array(dataPtr);
      }
    } finally {
      m._free(countPtr);
    }
  },

  /**
   * Set an integer parameter.
   * @param handle - The mesh handle
   * @param param - Parameter key from IPARAM_2D
   * @param value - Parameter value
   */
  setIParam(handle: MeshHandle2D, param: number, value: number): void {
    const m = getModule();
    const result = m._mmg2d_set_iparameter(handle, param, value);
    if (result !== 1) {
      throw new Error(`Failed to set integer parameter ${param}`);
    }
  },

  /**
   * Set a double parameter.
   * @param handle - The mesh handle
   * @param param - Parameter key from DPARAM_2D
   * @param value - Parameter value
   */
  setDParam(handle: MeshHandle2D, param: number, value: number): void {
    const m = getModule();
    const result = m._mmg2d_set_dparameter(handle, param, value);
    if (result !== 1) {
      throw new Error(`Failed to set double parameter ${param}`);
    }
  },

  /**
   * Set the solution size (allocate memory for solution data).
   * Must be called before setting solution values.
   * @param handle - The mesh handle
   * @param typEntity - Entity type (use SOL_ENTITY_2D.VERTEX)
   * @param nEntities - Number of entities (typically number of vertices)
   * @param typSol - Solution type (use SOL_TYPE_2D.SCALAR or SOL_TYPE_2D.TENSOR)
   * @throws Error if allocation fails
   */
  setSolSize(
    handle: MeshHandle2D,
    typEntity: number,
    nEntities: number,
    typSol: number,
  ): void {
    const m = getModule();
    const result = m._mmg2d_set_sol_size(handle, typEntity, nEntities, typSol);
    if (result !== 1) {
      throw new Error("Failed to set solution size");
    }
  },

  /**
   * Get the solution size information.
   * @param handle - The mesh handle
   * @returns Object containing entity type, number of entities, and solution type
   */
  getSolSize(handle: MeshHandle2D): SolInfo2D {
    const m = getModule();

    // Allocate space for 3 integers
    const ptr = m._malloc(3 * 4);
    if (ptr === 0) {
      throw new Error("Failed to allocate memory for solution size");
    }

    try {
      const result = m._mmg2d_get_sol_size(handle, ptr, ptr + 4, ptr + 8);
      if (result !== 1) {
        throw new Error("Failed to get solution size");
      }

      return {
        typEntity: m.getValue(ptr, "i32"),
        nEntities: m.getValue(ptr + 4, "i32"),
        typSol: m.getValue(ptr + 8, "i32"),
      };
    } finally {
      m._free(ptr);
    }
  },

  /**
   * Set all scalar solution values at once.
   * Must call setSolSize with SOL_TYPE_2D.SCALAR first.
   * @param handle - The mesh handle
   * @param values - Float64Array of solution values (one per vertex)
   * @throws Error if setting fails
   */
  setScalarSols(handle: MeshHandle2D, values: Float64Array): void {
    const m = getModule();

    const valuesPtr = m._malloc(values.byteLength);
    if (valuesPtr === 0) {
      throw new Error("Failed to allocate memory for solution values");
    }

    try {
      m.HEAPF64.set(values, valuesPtr / 8);
      const result = m._mmg2d_set_scalar_sols(handle, valuesPtr);
      if (result !== 1) {
        throw new Error("Failed to set scalar solution values");
      }
    } finally {
      m._free(valuesPtr);
    }
  },

  /**
   * Get all scalar solution values.
   * @param handle - The mesh handle
   * @returns Float64Array of solution values (one per vertex)
   * @throws Error if getting fails or solution is not scalar type
   */
  getScalarSols(handle: MeshHandle2D): Float64Array {
    const m = getModule();

    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory for count");
    }

    try {
      const dataPtr = m._mmg2d_get_scalar_sols(handle, countPtr);
      if (dataPtr === 0) {
        throw new Error(
          "Failed to get scalar solution values (wrong type or empty?)",
        );
      }

      try {
        const count = m.getValue(countPtr, "i32");
        const result = new Float64Array(count);
        result.set(m.HEAPF64.subarray(dataPtr / 8, dataPtr / 8 + count));
        return result;
      } finally {
        m._mmg2d_free_array(dataPtr);
      }
    } finally {
      m._free(countPtr);
    }
  },

  /**
   * Set all tensor solution values at once.
   * Must call setSolSize with SOL_TYPE_2D.TENSOR first.
   * @param handle - The mesh handle
   * @param values - Float64Array of tensor values (3 components per vertex: m11, m12, m22)
   * @throws Error if setting fails
   */
  setTensorSols(handle: MeshHandle2D, values: Float64Array): void {
    const m = getModule();

    const valuesPtr = m._malloc(values.byteLength);
    if (valuesPtr === 0) {
      throw new Error("Failed to allocate memory for tensor values");
    }

    try {
      m.HEAPF64.set(values, valuesPtr / 8);
      const result = m._mmg2d_set_tensor_sols(handle, valuesPtr);
      if (result !== 1) {
        throw new Error("Failed to set tensor solution values");
      }
    } finally {
      m._free(valuesPtr);
    }
  },

  /**
   * Get all tensor solution values.
   * @param handle - The mesh handle
   * @returns Float64Array of tensor values (3 components per vertex)
   * @throws Error if getting fails or solution is not tensor type
   */
  getTensorSols(handle: MeshHandle2D): Float64Array {
    const m = getModule();

    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory for count");
    }

    try {
      const dataPtr = m._mmg2d_get_tensor_sols(handle, countPtr);
      if (dataPtr === 0) {
        throw new Error(
          "Failed to get tensor solution values (wrong type or empty?)",
        );
      }

      try {
        const count = m.getValue(countPtr, "i32");
        // 3 components per vertex for 2D tensor
        const result = new Float64Array(count * 3);
        result.set(m.HEAPF64.subarray(dataPtr / 8, dataPtr / 8 + count * 3));
        return result;
      } finally {
        m._mmg2d_free_array(dataPtr);
      }
    } finally {
      m._free(countPtr);
    }
  },

  /**
   * Run the MMG2D remeshing algorithm.
   * @param handle - The mesh handle
   * @returns Return code (0 = success, 1 = low failure, 2 = strong failure)
   */
  mmg2dlib(handle: MeshHandle2D): number {
    const m = getModule();
    return m._mmg2d_remesh(handle);
  },

  /**
   * Load a mesh from a file in the virtual filesystem.
   * Use FS.writeFile() to write mesh data to the virtual filesystem first.
   * @param handle - The mesh handle
   * @param filename - Path to the mesh file in the virtual filesystem
   * @throws Error if loading fails
   */
  loadMesh(handle: MeshHandle2D, filename: string): void {
    const m = getModule();
    const filenameLen = m.lengthBytesUTF8(filename) + 1;
    const filenamePtr = m._malloc(filenameLen);
    if (filenamePtr === 0) {
      throw new Error("Failed to allocate memory for filename");
    }
    try {
      m.stringToUTF8(filename, filenamePtr, filenameLen);
      const result = m._mmg2d_load_mesh(handle, filenamePtr);
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
  saveMesh(handle: MeshHandle2D, filename: string): void {
    const m = getModule();
    const filenameLen = m.lengthBytesUTF8(filename) + 1;
    const filenamePtr = m._malloc(filenameLen);
    if (filenamePtr === 0) {
      throw new Error("Failed to allocate memory for filename");
    }
    try {
      m.stringToUTF8(filename, filenamePtr, filenameLen);
      const result = m._mmg2d_save_mesh(handle, filenamePtr);
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
  loadSol(handle: MeshHandle2D, filename: string): void {
    const m = getModule();
    const filenameLen = m.lengthBytesUTF8(filename) + 1;
    const filenamePtr = m._malloc(filenameLen);
    if (filenamePtr === 0) {
      throw new Error("Failed to allocate memory for filename");
    }
    try {
      m.stringToUTF8(filename, filenamePtr, filenameLen);
      const result = m._mmg2d_load_sol(handle, filenamePtr);
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
  saveSol(handle: MeshHandle2D, filename: string): void {
    const m = getModule();
    const filenameLen = m.lengthBytesUTF8(filename) + 1;
    const filenamePtr = m._malloc(filenameLen);
    if (filenamePtr === 0) {
      throw new Error("Failed to allocate memory for filename");
    }
    try {
      m.stringToUTF8(filename, filenamePtr, filenameLen);
      const result = m._mmg2d_save_sol(handle, filenamePtr);
      if (result !== 1) {
        throw new Error(`Failed to save solution to ${filename}`);
      }
    } finally {
      m._free(filenamePtr);
    }
  },

  /**
   * Get the quality of a single triangle.
   * Quality values range from 0 (degenerate) to 1 (best attainable).
   * @param handle - The mesh handle
   * @param k - Triangle index (1-indexed, MMG convention)
   * @returns Quality value between 0 and 1
   */
  getTriangleQuality(handle: MeshHandle2D, k: number): number {
    const m = getModule();
    return m._mmg2d_get_triangle_quality(handle, k);
  },

  /**
   * Get quality values for all triangles.
   * Quality values range from 0 (degenerate) to 1 (best attainable).
   * @param handle - The mesh handle
   * @returns Float64Array of quality values (one per triangle)
   */
  getTrianglesQualities(handle: MeshHandle2D): Float64Array {
    const m = getModule();

    const countPtr = m._malloc(4);
    if (countPtr === 0) {
      throw new Error("Failed to allocate memory");
    }

    try {
      const dataPtr = m._mmg2d_get_triangles_qualities(handle, countPtr);
      if (dataPtr === 0) {
        const count = m.getValue(countPtr, "i32");
        if (count === 0) {
          return new Float64Array(0);
        }
        throw new Error("Failed to get triangles qualities");
      }

      try {
        const count = m.getValue(countPtr, "i32");
        const result = new Float64Array(count);
        result.set(m.HEAPF64.subarray(dataPtr / 8, dataPtr / 8 + count));
        return result;
      } finally {
        m._mmg2d_free_array(dataPtr);
      }
    } finally {
      m._free(countPtr);
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
export function getFS2D(): EmscriptenFS {
  const m = getModule();
  return m.FS;
}
