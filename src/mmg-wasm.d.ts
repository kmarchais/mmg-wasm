/**
 * Type declarations for the Emscripten-generated mmg WASM module
 */

declare module "*/mmg.js" {
  interface EmscriptenModule {
    _mmg3d_init(): number;
    _mmg3d_free(handle: number): number;
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
    _malloc(size: number): number;
    _free(ptr: number): void;
    HEAPU8: Uint8Array;
    HEAPF64: Float64Array;
    HEAP32: Int32Array;
    getValue(ptr: number, type: string): number;
    setValue(ptr: number, value: number, type: string): void;
  }

  export default function createModule(): Promise<EmscriptenModule>;
}
