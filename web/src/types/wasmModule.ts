/**
 * Type definitions for the MMG WASM module interface.
 * These types describe the low-level C functions exported from Emscripten.
 */

export interface MmgModule {
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
  _mmg2d_get_triangle_quality: (handle: number, k: number) => number;
  _mmg2d_get_triangles_qualities: (handle: number, outCountPtr: number) => number;

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
  _mmgs_get_triangle_quality: (handle: number, k: number) => number;
  _mmgs_get_triangles_qualities: (handle: number, outCountPtr: number) => number;

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
  _mmg3d_get_tetrahedron_quality: (handle: number, k: number) => number;
  _mmg3d_get_tetrahedra_qualities: (handle: number, outCountPtr: number) => number;

  // String helpers
  lengthBytesUTF8: (str: string) => number;
  stringToUTF8: (str: string, ptr: number, maxBytes: number) => void;
}
