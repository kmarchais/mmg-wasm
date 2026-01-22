/**
 * Type declarations for the Emscripten-generated mmg WASM module
 */

declare module "*/mmg.js" {
  interface EmscriptenFS {
    writeFile(
      path: string,
      data: Uint8Array | string,
      opts?: { encoding?: "binary" | "utf8" },
    ): void;
    readFile(path: string, opts: { encoding: "binary" }): Uint8Array;
    readFile(path: string, opts: { encoding: "utf8" }): string;
    readFile(
      path: string,
      opts?: { encoding?: "binary" | "utf8" },
    ): Uint8Array | string;
    unlink(path: string): void;
    mkdir(path: string, mode?: number): void;
    rmdir(path: string): void;
    analyzePath(path: string): {
      exists: boolean;
      path: string;
      name: string;
      object: unknown;
      parentExists: boolean;
      parentPath: string;
      parentObject: unknown;
    };
    isFile(mode: number): boolean;
    isDir(mode: number): boolean;
    readdir(path: string): string[];
    rename(oldPath: string, newPath: string): void;
    stat(path: string): {
      dev: number;
      ino: number;
      mode: number;
      nlink: number;
      uid: number;
      gid: number;
      rdev: number;
      size: number;
      atime: Date;
      mtime: Date;
      ctime: Date;
      blksize: number;
      blocks: number;
    };
  }

  interface EmscriptenModule {
    // MMG3D functions
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
    _mmg3d_set_sol_size(
      handle: number,
      typEntity: number,
      np: number,
      typSol: number,
    ): number;
    _mmg3d_get_sol_size(
      handle: number,
      typEntityPtr: number,
      npPtr: number,
      typSolPtr: number,
    ): number;
    _mmg3d_set_scalar_sols(handle: number, valuesPtr: number): number;
    _mmg3d_get_scalar_sols(handle: number, outCountPtr: number): number;
    _mmg3d_set_tensor_sols(handle: number, valuesPtr: number): number;
    _mmg3d_get_tensor_sols(handle: number, outCountPtr: number): number;
    _mmg3d_remesh(handle: number): number;
    _mmg3d_free_array(ptr: number): void;
    _mmg3d_load_mesh(handle: number, filenamePtr: number): number;
    _mmg3d_save_mesh(handle: number, filenamePtr: number): number;
    _mmg3d_load_sol(handle: number, filenamePtr: number): number;
    _mmg3d_save_sol(handle: number, filenamePtr: number): number;

    // MMG2D functions
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
    _mmg2d_load_mesh(handle: number, filenamePtr: number): number;
    _mmg2d_save_mesh(handle: number, filenamePtr: number): number;
    _mmg2d_load_sol(handle: number, filenamePtr: number): number;
    _mmg2d_save_sol(handle: number, filenamePtr: number): number;

    // MMGS functions
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
    _mmgs_set_sol_size(
      handle: number,
      typEntity: number,
      np: number,
      typSol: number,
    ): number;
    _mmgs_get_sol_size(
      handle: number,
      typEntityPtr: number,
      npPtr: number,
      typSolPtr: number,
    ): number;
    _mmgs_set_scalar_sols(handle: number, valuesPtr: number): number;
    _mmgs_get_scalar_sols(handle: number, outCountPtr: number): number;
    _mmgs_set_tensor_sols(handle: number, valuesPtr: number): number;
    _mmgs_get_tensor_sols(handle: number, outCountPtr: number): number;
    _mmgs_load_mesh(handle: number, filenamePtr: number): number;
    _mmgs_save_mesh(handle: number, filenamePtr: number): number;
    _mmgs_load_sol(handle: number, filenamePtr: number): number;
    _mmgs_save_sol(handle: number, filenamePtr: number): number;

    // Memory functions
    _malloc(size: number): number;
    _free(ptr: number): void;
    HEAPU8: Uint8Array;
    HEAPF64: Float64Array;
    HEAP32: Int32Array;
    getValue(ptr: number, type: string): number;
    setValue(ptr: number, value: number, type: string): void;
    lengthBytesUTF8(str: string): number;
    stringToUTF8(str: string, ptr: number, maxBytes: number): void;

    // Filesystem
    FS: EmscriptenFS;
  }

  export default function createModule(): Promise<EmscriptenModule>;
}
