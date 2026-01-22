/**
 * Unified Mesh class with auto-detection
 *
 * Provides a high-level API that works across all mesh types (2D, 3D, surface)
 * with automatic type detection and consistent methods.
 */

import type { EmscriptenFS } from "./fs";
import {
  IPARAM_2D,
  MMG2D,
  type MeshHandle2D,
  type MeshSize2D,
  getFS2D,
  initMMG2D,
} from "./mmg2d";
import { SOL_ENTITY_2D, SOL_TYPE_2D } from "./mmg2d";
import {
  IPARAM,
  MMG3D,
  type MeshHandle,
  type MeshSize,
  getFS,
  initMMG3D,
} from "./mmg3d";
import { SOL_ENTITY, SOL_TYPE } from "./mmg3d";
import {
  IPARAM_S,
  MMGS,
  type MeshHandleS,
  type MeshSizeS,
  getFSS,
  initMMGS,
} from "./mmgs";
import { SOL_ENTITY_S, SOL_TYPE_S } from "./mmgs";
import { type RemeshOptions, applyOptions } from "./options";
import type { RemeshResult } from "./result";
import {
  BoxSizingConstraint,
  CircleSizingConstraint,
  CylinderSizingConstraint,
  type LocalSizingConstraint,
  SphereSizingConstraint,
  type Vec2,
  type Vec3,
  combineSizingConstraints,
} from "./sizing";

/**
 * Mesh types supported by the library
 */
export enum MeshType {
  /** 2D mesh with triangles */
  Mesh2D = "2d",
  /** 3D volumetric mesh with tetrahedra */
  Mesh3D = "3d",
  /** 3D surface mesh with triangles */
  MeshS = "surface",
}

/**
 * Input data for creating a mesh
 */
export interface MeshData {
  /** Flattened vertex coordinates: [x0, y0, (z0,) x1, y1, (z1,) ...] */
  vertices: Float64Array;
  /** Flattened cell indices (1-indexed): [v0, v1, v2, (v3,) ...] */
  cells: Int32Array;
  /** Explicit mesh type (auto-detected if not provided) */
  type?: MeshType;
  /** Boundary faces/edges (1-indexed) */
  boundaryFaces?: Int32Array;
  /** Vertex references (material IDs) */
  vertexRefs?: Int32Array;
  /** Cell references (material IDs) */
  cellRefs?: Int32Array;
}

/**
 * Options for loading a mesh from file/buffer
 */
export interface LoadOptions {
  /** Mesh type (auto-detected from file if not provided) */
  type?: MeshType;
  /** File format (default: 'mesh') */
  format?: "mesh" | "meshb";
}

// Track module initialization state
let mmg2dInitialized = false;
let mmg3dInitialized = false;
let mmgsInitialized = false;

/**
 * Initialize the appropriate MMG module for a mesh type
 */
async function ensureModuleInitialized(type: MeshType): Promise<void> {
  switch (type) {
    case MeshType.Mesh2D:
      if (!mmg2dInitialized) {
        await initMMG2D();
        mmg2dInitialized = true;
      }
      break;
    case MeshType.Mesh3D:
      if (!mmg3dInitialized) {
        await initMMG3D();
        mmg3dInitialized = true;
      }
      break;
    case MeshType.MeshS:
      if (!mmgsInitialized) {
        await initMMGS();
        mmgsInitialized = true;
      }
      break;
  }
}

/**
 * Unified mesh class that wraps MMG2D, MMG3D, and MMGS
 *
 * @example
 * ```typescript
 * // Create from arrays with auto-detection
 * const mesh = new Mesh({
 *   vertices: new Float64Array([0, 0, 0, 1, 0, 0, 0.5, 0.866, 0, 0.5, 0.289, 0.816]),
 *   cells: new Int32Array([1, 2, 3, 4]),  // tetrahedron -> auto-detects Mesh3D
 * });
 *
 * // Load from ArrayBuffer
 * const mesh = await Mesh.load(arrayBuffer);
 *
 * // Access properties
 * console.log(mesh.nVertices, mesh.nCells);
 *
 * // Export
 * const buffer = mesh.toArrayBuffer('mesh');
 *
 * // Cleanup
 * mesh.free();
 * ```
 */
export class Mesh {
  private _handle: MeshHandle | MeshHandle2D | MeshHandleS;
  private _type: MeshType;
  private _disposed = false;
  private _sizingConstraints: LocalSizingConstraint[] = [];

  /**
   * Create a mesh from vertex and cell data
   *
   * @param data - Mesh data with vertices, cells, and optional type
   * @throws Error if module is not initialized (use Mesh.create() for async initialization)
   */
  constructor(data: MeshData) {
    this._type = data.type ?? this.detectType(data);
    this._handle = this.createHandle();
    this.setData(data);
  }

  /**
   * Create a mesh asynchronously (ensures module is initialized)
   *
   * @param data - Mesh data with vertices, cells, and optional type
   * @returns Promise resolving to the created Mesh
   */
  static async create(data: MeshData): Promise<Mesh> {
    const type = data.type ?? Mesh.detectTypeStatic(data);
    await ensureModuleInitialized(type);
    return new Mesh({ ...data, type });
  }

  /**
   * Load a mesh from an ArrayBuffer or file path
   *
   * @param source - ArrayBuffer or file path (for browser: ArrayBuffer, for Node: path)
   * @param options - Load options including type and format
   * @returns Promise resolving to the loaded Mesh
   */
  static async load(
    source: ArrayBuffer | Uint8Array | string,
    options: LoadOptions = {},
  ): Promise<Mesh> {
    const format = options.format ?? "mesh";

    // If source is a string (path/URL), fetch it
    let buffer: Uint8Array;
    if (typeof source === "string") {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch mesh: ${response.statusText}`);
      }
      buffer = new Uint8Array(await response.arrayBuffer());
    } else if (source instanceof ArrayBuffer) {
      buffer = new Uint8Array(source);
    } else {
      buffer = source;
    }

    // Try to detect type from file content or use provided type
    const type = options.type ?? (await Mesh.detectTypeFromBuffer(buffer));
    await ensureModuleInitialized(type);

    // Write buffer to virtual filesystem and load
    const FS = Mesh.getFS(type);
    const filename = `/input.${format}`;

    FS.writeFile(filename, buffer);

    try {
      const mesh = new Mesh({
        vertices: new Float64Array(0),
        cells: new Int32Array(0),
        type,
      });

      // Load from file into the handle
      mesh.loadFromFile(filename);

      return mesh;
    } finally {
      // Clean up temporary file
      try {
        FS.unlink(filename);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Load a mesh from a URL
   *
   * @param url - URL to fetch the mesh from
   * @param options - Load options
   * @returns Promise resolving to the loaded Mesh
   */
  static async fromURL(url: string, options: LoadOptions = {}): Promise<Mesh> {
    return Mesh.load(url, options);
  }

  // =====================
  // Properties
  // =====================

  /** Mesh type (2D, 3D, or surface) */
  get type(): MeshType {
    return this._type;
  }

  /** Mesh dimension (2 or 3) */
  get dimension(): number {
    return this._type === MeshType.Mesh2D ? 2 : 3;
  }

  /** Number of vertices */
  get nVertices(): number {
    this.checkDisposed();
    return this.getMeshSize().nVertices;
  }

  /** Number of cells (triangles for 2D/surface, tetrahedra for 3D) */
  get nCells(): number {
    this.checkDisposed();
    const size = this.getMeshSize();
    if (this._type === MeshType.Mesh3D) {
      return (size as MeshSize).nTetrahedra;
    }
    return (size as MeshSize2D | MeshSizeS).nTriangles;
  }

  /** Number of boundary faces (edges for 2D, triangles for 3D, edges for surface) */
  get nBoundaryFaces(): number {
    this.checkDisposed();
    const size = this.getMeshSize();
    if (this._type === MeshType.Mesh3D) {
      return (size as MeshSize).nTriangles;
    }
    return (size as MeshSize2D | MeshSizeS).nEdges;
  }

  /** Vertex coordinates as Float64Array */
  get vertices(): Float64Array {
    this.checkDisposed();
    switch (this._type) {
      case MeshType.Mesh2D:
        return MMG2D.getVertices(this._handle as MeshHandle2D);
      case MeshType.Mesh3D:
        return MMG3D.getVertices(this._handle as MeshHandle);
      case MeshType.MeshS:
        return MMGS.getVertices(this._handle as MeshHandleS);
      default:
        throw new Error(`Unknown mesh type: ${this._type}`);
    }
  }

  /** Cell indices as Int32Array (1-indexed) */
  get cells(): Int32Array {
    this.checkDisposed();
    switch (this._type) {
      case MeshType.Mesh2D:
        return MMG2D.getTriangles(this._handle as MeshHandle2D);
      case MeshType.Mesh3D:
        return MMG3D.getTetrahedra(this._handle as MeshHandle);
      case MeshType.MeshS:
        return MMGS.getTriangles(this._handle as MeshHandleS);
      default:
        throw new Error(`Unknown mesh type: ${this._type}`);
    }
  }

  /** Boundary faces/edges as Int32Array (1-indexed) */
  get boundaryFaces(): Int32Array {
    this.checkDisposed();
    switch (this._type) {
      case MeshType.Mesh2D:
        return MMG2D.getEdges(this._handle as MeshHandle2D);
      case MeshType.Mesh3D:
        return MMG3D.getTriangles(this._handle as MeshHandle);
      case MeshType.MeshS:
        return MMGS.getEdges(this._handle as MeshHandleS);
      default:
        throw new Error(`Unknown mesh type: ${this._type}`);
    }
  }

  // =====================
  // Local Sizing Methods
  // =====================

  /**
   * Set target edge size inside a spherical region (3D only)
   *
   * Vertices inside the sphere will be refined to the specified size.
   * Multiple constraints can be combined - the minimum size is used.
   *
   * @param center - Center of the sphere [x, y, z]
   * @param radius - Radius of the sphere
   * @param size - Target edge size inside the sphere
   * @returns this (for method chaining)
   * @throws Error if used with 2D mesh or invalid parameters
   *
   * @example
   * ```typescript
   * mesh.setSizeSphere([0.5, 0.5, 0.5], 0.2, 0.01);
   * const result = await mesh.remesh();
   * ```
   */
  setSizeSphere(center: Vec3, radius: number, size: number): this {
    this.checkDisposed();

    if (this._type === MeshType.Mesh2D) {
      throw new Error(
        "setSizeSphere is only available for 3D meshes. Use setSizeCircle for 2D meshes.",
      );
    }

    this._sizingConstraints.push(
      new SphereSizingConstraint(center, radius, size),
    );
    return this;
  }

  /**
   * Set target edge size inside a circular region (2D only)
   *
   * Vertices inside the circle will be refined to the specified size.
   * Multiple constraints can be combined - the minimum size is used.
   *
   * @param center - Center of the circle [x, y]
   * @param radius - Radius of the circle
   * @param size - Target edge size inside the circle
   * @returns this (for method chaining)
   * @throws Error if used with 3D mesh or invalid parameters
   *
   * @example
   * ```typescript
   * mesh.setSizeCircle([0.5, 0.5], 0.2, 0.01);
   * const result = await mesh.remesh();
   * ```
   */
  setSizeCircle(center: Vec2, radius: number, size: number): this {
    this.checkDisposed();

    if (this._type !== MeshType.Mesh2D) {
      throw new Error(
        "setSizeCircle is only available for 2D meshes. Use setSizeSphere for 3D meshes.",
      );
    }

    this._sizingConstraints.push(
      new CircleSizingConstraint(center, radius, size),
    );
    return this;
  }

  /**
   * Set target edge size inside a box region
   *
   * For 3D meshes, the box is defined by min [x, y, z] and max [x, y, z].
   * For 2D meshes, the box is defined by min [x, y] and max [x, y].
   * Vertices inside the box will be refined to the specified size.
   * Multiple constraints can be combined - the minimum size is used.
   *
   * @param min - Minimum corner of the box
   * @param max - Maximum corner of the box
   * @param size - Target edge size inside the box
   * @returns this (for method chaining)
   * @throws Error if dimensions don't match mesh type or invalid parameters
   *
   * @example
   * ```typescript
   * // 3D mesh
   * mesh.setSizeBox([0, 0, 0], [0.3, 0.3, 0.3], 0.02);
   *
   * // 2D mesh
   * mesh.setSizeBox([0, 0], [0.3, 0.3], 0.02);
   * ```
   */
  setSizeBox(min: Vec2 | Vec3, max: Vec2 | Vec3, size: number): this {
    this.checkDisposed();

    const expectedDim = this._type === MeshType.Mesh2D ? 2 : 3;
    if (min.length !== expectedDim || max.length !== expectedDim) {
      throw new Error(
        `For ${this._type} meshes, min and max must have ${expectedDim} dimensions`,
      );
    }

    this._sizingConstraints.push(new BoxSizingConstraint(min, max, size));
    return this;
  }

  /**
   * Set target edge size inside a cylindrical region (3D only)
   *
   * The cylinder is defined by its axis (from p1 to p2) and radius.
   * Vertices inside the cylinder will be refined to the specified size.
   * Multiple constraints can be combined - the minimum size is used.
   *
   * @param p1 - First endpoint of the cylinder axis [x, y, z]
   * @param p2 - Second endpoint of the cylinder axis [x, y, z]
   * @param radius - Radius of the cylinder
   * @param size - Target edge size inside the cylinder
   * @returns this (for method chaining)
   * @throws Error if used with 2D mesh or invalid parameters
   *
   * @example
   * ```typescript
   * mesh.setSizeCylinder([0, 0, 0], [1, 0, 0], 0.1, 0.01);
   * const result = await mesh.remesh();
   * ```
   */
  setSizeCylinder(p1: Vec3, p2: Vec3, radius: number, size: number): this {
    this.checkDisposed();

    if (this._type === MeshType.Mesh2D) {
      throw new Error("setSizeCylinder is only available for 3D meshes.");
    }

    this._sizingConstraints.push(
      new CylinderSizingConstraint(p1, p2, radius, size),
    );
    return this;
  }

  /**
   * Clear all local size constraints
   *
   * @returns this (for method chaining)
   */
  clearLocalSizes(): this {
    this._sizingConstraints = [];
    return this;
  }

  /**
   * Get the number of active local sizing constraints
   */
  get localSizeCount(): number {
    return this._sizingConstraints.length;
  }

  // =====================
  // Export Methods
  // =====================

  /**
   * Export mesh to ArrayBuffer
   *
   * @param format - Output format ('mesh' for ASCII, 'meshb' for binary)
   * @returns ArrayBuffer containing the mesh data
   */
  toArrayBuffer(format: "mesh" | "meshb" = "mesh"): Uint8Array {
    this.checkDisposed();

    const FS = Mesh.getFS(this._type);
    const filename = `/output.${format}`;

    // Save to virtual filesystem
    switch (this._type) {
      case MeshType.Mesh2D:
        MMG2D.saveMesh(this._handle as MeshHandle2D, filename);
        break;
      case MeshType.Mesh3D:
        MMG3D.saveMesh(this._handle as MeshHandle, filename);
        break;
      case MeshType.MeshS:
        MMGS.saveMesh(this._handle as MeshHandleS, filename);
        break;
    }

    // Read file and return as ArrayBuffer
    const data = FS.readFile(filename, { encoding: "binary" });

    // Clean up
    try {
      FS.unlink(filename);
    } catch {
      // Ignore cleanup errors
    }

    return data;
  }

  /**
   * Release WASM memory associated with this mesh
   *
   * After calling free(), the mesh instance is no longer usable.
   */
  free(): void {
    if (this._disposed) {
      return;
    }

    switch (this._type) {
      case MeshType.Mesh2D:
        MMG2D.free(this._handle as MeshHandle2D);
        break;
      case MeshType.Mesh3D:
        MMG3D.free(this._handle as MeshHandle);
        break;
      case MeshType.MeshS:
        MMGS.free(this._handle as MeshHandleS);
        break;
    }

    this._disposed = true;
  }

  /**
   * Remesh the mesh with the given options
   *
   * This method performs mesh adaptation using the MMG library.
   * The original mesh is unchanged (immutable pattern) - a new Mesh
   * instance is returned in the result.
   *
   * @param options - Remeshing options (hmax, hmin, hausd, etc.)
   * @returns Promise resolving to RemeshResult with new mesh and statistics
   * @throws Error if remeshing fails
   *
   * @example
   * ```typescript
   * const mesh = await Mesh.create({ vertices, cells });
   *
   * // Simple remeshing with edge size control
   * const result = await mesh.remesh({ hmax: 0.1 });
   *
   * // Access results
   * console.log(`Vertices: ${result.nVertices}`);
   * console.log(`Quality improved: ${result.qualityImprovement.toFixed(2)}x`);
   *
   * // Use the remeshed mesh
   * const newMesh = result.mesh;
   *
   * // Original mesh is unchanged
   * console.log(`Original vertices: ${mesh.nVertices}`);
   * ```
   */
  async remesh(options: RemeshOptions = {}): Promise<RemeshResult> {
    this.checkDisposed();

    const startTime = performance.now();

    // Store original counts for statistics
    const originalVertexCount = this.nVertices;

    // Clone mesh to a new handle for immutable pattern
    const workingHandle = this.cloneHandle();

    try {
      // Apply local sizing constraints if any
      if (this._sizingConstraints.length > 0) {
        this.applySizingConstraints(workingHandle);
      }

      // Capture quality before remeshing
      const qualityBefore = this.getMinQuality(workingHandle);

      // Apply options to the working handle
      applyOptions(workingHandle, this._type, options);

      // Run remeshing
      const returnCode = this.runRemesh(workingHandle);

      // Check return code
      const success = returnCode === 0 || returnCode === 1;
      if (returnCode === 2) {
        throw new Error("Remeshing failed with strong failure (code 2)");
      }

      // Capture quality after remeshing
      const qualityAfter = this.getMinQuality(workingHandle);

      // Create result mesh from the working handle
      const resultMesh = this.extractMeshFromHandle(workingHandle);

      const elapsed = performance.now() - startTime;

      // Estimate inserted/deleted vertices
      const newVertexCount = resultMesh.nVertices;
      const vertexDelta = newVertexCount - originalVertexCount;
      const nInserted = vertexDelta > 0 ? vertexDelta : 0;
      const nDeleted = vertexDelta < 0 ? -vertexDelta : 0;

      return {
        mesh: resultMesh,
        nVertices: resultMesh.nVertices,
        nCells: resultMesh.nCells,
        nBoundaryFaces: resultMesh.nBoundaryFaces,
        elapsed,
        qualityBefore,
        qualityAfter,
        qualityImprovement:
          qualityBefore > 0
            ? qualityAfter / qualityBefore
            : Number.POSITIVE_INFINITY,
        nInserted,
        nDeleted,
        nSwapped: 0, // MMG doesn't expose this
        nMoved: 0, // MMG doesn't expose this
        success,
        warnings:
          returnCode === 1
            ? ["Remeshing completed with warnings (low failure)"]
            : [],
      };
    } catch (error) {
      // Free the working handle on error
      this.freeHandle(workingHandle);
      throw error;
    }
  }

  /**
   * Clone the current mesh to a new handle
   */
  private cloneHandle(): MeshHandle | MeshHandle2D | MeshHandleS {
    const newHandle = this.createHandle();

    // Copy mesh data to new handle
    switch (this._type) {
      case MeshType.Mesh2D: {
        const size = MMG2D.getMeshSize(this._handle as MeshHandle2D);
        MMG2D.setMeshSize(
          newHandle as MeshHandle2D,
          size.nVertices,
          size.nTriangles,
          size.nQuads,
          size.nEdges,
        );
        MMG2D.setVertices(
          newHandle as MeshHandle2D,
          MMG2D.getVertices(this._handle as MeshHandle2D),
        );
        if (size.nTriangles > 0) {
          MMG2D.setTriangles(
            newHandle as MeshHandle2D,
            MMG2D.getTriangles(this._handle as MeshHandle2D),
          );
        }
        if (size.nEdges > 0) {
          MMG2D.setEdges(
            newHandle as MeshHandle2D,
            MMG2D.getEdges(this._handle as MeshHandle2D),
          );
        }
        break;
      }
      case MeshType.Mesh3D: {
        const size = MMG3D.getMeshSize(this._handle as MeshHandle);
        MMG3D.setMeshSize(
          newHandle as MeshHandle,
          size.nVertices,
          size.nTetrahedra,
          size.nPrisms,
          size.nTriangles,
          size.nQuads,
          size.nEdges,
        );
        MMG3D.setVertices(
          newHandle as MeshHandle,
          MMG3D.getVertices(this._handle as MeshHandle),
        );
        if (size.nTetrahedra > 0) {
          MMG3D.setTetrahedra(
            newHandle as MeshHandle,
            MMG3D.getTetrahedra(this._handle as MeshHandle),
          );
        }
        if (size.nTriangles > 0) {
          MMG3D.setTriangles(
            newHandle as MeshHandle,
            MMG3D.getTriangles(this._handle as MeshHandle),
          );
        }
        break;
      }
      case MeshType.MeshS: {
        const size = MMGS.getMeshSize(this._handle as MeshHandleS);
        MMGS.setMeshSize(
          newHandle as MeshHandleS,
          size.nVertices,
          size.nTriangles,
          size.nEdges,
        );
        MMGS.setVertices(
          newHandle as MeshHandleS,
          MMGS.getVertices(this._handle as MeshHandleS),
        );
        if (size.nTriangles > 0) {
          MMGS.setTriangles(
            newHandle as MeshHandleS,
            MMGS.getTriangles(this._handle as MeshHandleS),
          );
        }
        if (size.nEdges > 0) {
          MMGS.setEdges(
            newHandle as MeshHandleS,
            MMGS.getEdges(this._handle as MeshHandleS),
          );
        }
        break;
      }
    }

    return newHandle;
  }

  /**
   * Get minimum element quality from a handle
   */
  private getMinQuality(
    handle: MeshHandle | MeshHandle2D | MeshHandleS,
  ): number {
    let qualities: Float64Array;

    switch (this._type) {
      case MeshType.Mesh2D:
        qualities = MMG2D.getTrianglesQualities(handle as MeshHandle2D);
        break;
      case MeshType.Mesh3D:
        qualities = MMG3D.getTetrahedraQualities(handle as MeshHandle);
        break;
      case MeshType.MeshS:
        qualities = MMGS.getTrianglesQualities(handle as MeshHandleS);
        break;
      default:
        throw new Error(`Unknown mesh type: ${this._type}`);
    }

    if (qualities.length === 0) {
      return 0;
    }

    let min = Number.POSITIVE_INFINITY;
    for (let i = 0; i < qualities.length; i++) {
      if (qualities[i] < min) {
        min = qualities[i];
      }
    }

    return min === Number.POSITIVE_INFINITY ? 0 : min;
  }

  /**
   * Run the remeshing algorithm on a handle
   */
  private runRemesh(handle: MeshHandle | MeshHandle2D | MeshHandleS): number {
    switch (this._type) {
      case MeshType.Mesh2D:
        return MMG2D.mmg2dlib(handle as MeshHandle2D);
      case MeshType.Mesh3D:
        return MMG3D.mmg3dlib(handle as MeshHandle);
      case MeshType.MeshS:
        return MMGS.mmgslib(handle as MeshHandleS);
      default:
        throw new Error(`Unknown mesh type: ${this._type}`);
    }
  }

  /**
   * Extract a new Mesh instance from a handle
   * Note: The handle ownership is transferred to the new Mesh
   */
  private extractMeshFromHandle(
    handle: MeshHandle | MeshHandle2D | MeshHandleS,
  ): Mesh {
    // Create a new Mesh that takes ownership of this handle
    const mesh = Object.create(Mesh.prototype) as Mesh;
    mesh._handle = handle;
    mesh._type = this._type;
    mesh._disposed = false;
    mesh._sizingConstraints = [];
    return mesh;
  }

  /**
   * Free a handle without affecting the main mesh
   */
  private freeHandle(handle: MeshHandle | MeshHandle2D | MeshHandleS): void {
    switch (this._type) {
      case MeshType.Mesh2D:
        MMG2D.free(handle as MeshHandle2D);
        break;
      case MeshType.Mesh3D:
        MMG3D.free(handle as MeshHandle);
        break;
      case MeshType.MeshS:
        MMGS.free(handle as MeshHandleS);
        break;
    }
  }

  /**
   * Apply local sizing constraints to a handle by setting the metric field
   */
  private applySizingConstraints(
    handle: MeshHandle | MeshHandle2D | MeshHandleS,
  ): void {
    // Get vertices from the handle
    let vertices: Float64Array;
    let nVertices: number;

    switch (this._type) {
      case MeshType.Mesh2D:
        vertices = MMG2D.getVertices(handle as MeshHandle2D);
        nVertices = vertices.length / 2;
        break;
      case MeshType.Mesh3D:
        vertices = MMG3D.getVertices(handle as MeshHandle);
        nVertices = vertices.length / 3;
        break;
      case MeshType.MeshS:
        vertices = MMGS.getVertices(handle as MeshHandleS);
        nVertices = vertices.length / 3;
        break;
      default:
        throw new Error(`Unknown mesh type: ${this._type}`);
    }

    // Compute combined sizes from all constraints
    const dimension = this._type === MeshType.Mesh2D ? 2 : 3;
    const sizes = combineSizingConstraints(
      this._sizingConstraints,
      vertices,
      dimension as 2 | 3,
    );

    // Compute a default size for unconstrained vertices based on mesh bounding box
    // MMG requires positive metric values - 0 is not valid
    const defaultSize = this.computeDefaultSize(vertices, dimension);

    // Convert infinite sizes to the default size
    for (let i = 0; i < sizes.length; i++) {
      if (!Number.isFinite(sizes[i])) {
        sizes[i] = defaultSize;
      }
    }

    // Set the solution size and values
    switch (this._type) {
      case MeshType.Mesh2D:
        MMG2D.setSolSize(
          handle as MeshHandle2D,
          SOL_ENTITY_2D.VERTEX,
          nVertices,
          SOL_TYPE_2D.SCALAR,
        );
        MMG2D.setScalarSols(handle as MeshHandle2D, sizes);
        break;
      case MeshType.Mesh3D:
        MMG3D.setSolSize(
          handle as MeshHandle,
          SOL_ENTITY.VERTEX,
          nVertices,
          SOL_TYPE.SCALAR,
        );
        MMG3D.setScalarSols(handle as MeshHandle, sizes);
        break;
      case MeshType.MeshS:
        MMGS.setSolSize(
          handle as MeshHandleS,
          SOL_ENTITY_S.VERTEX,
          nVertices,
          SOL_TYPE_S.SCALAR,
        );
        MMGS.setScalarSols(handle as MeshHandleS, sizes);
        break;
    }
  }

  /**
   * Compute a reasonable default edge size based on mesh bounding box
   */
  private computeDefaultSize(
    vertices: Float64Array,
    dimension: number,
  ): number {
    if (vertices.length === 0) {
      return 1.0;
    }

    // Compute bounding box
    const min = new Array(dimension).fill(Number.POSITIVE_INFINITY);
    const max = new Array(dimension).fill(Number.NEGATIVE_INFINITY);

    const nVertices = vertices.length / dimension;
    for (let i = 0; i < nVertices; i++) {
      for (let d = 0; d < dimension; d++) {
        const v = vertices[i * dimension + d];
        if (v < min[d]) min[d] = v;
        if (v > max[d]) max[d] = v;
      }
    }

    // Compute diagonal length
    let diag2 = 0;
    for (let d = 0; d < dimension; d++) {
      const diff = max[d] - min[d];
      diag2 += diff * diff;
    }

    // Use a fraction of the diagonal as default size
    // This allows MMG to refine freely while respecting the mesh scale
    return Math.sqrt(diag2) * 0.2;
  }

  // =====================
  // Private methods
  // =====================

  private checkDisposed(): void {
    if (this._disposed) {
      throw new Error("Mesh has been disposed");
    }
  }

  /**
   * Detect mesh type from input data
   */
  private detectType(data: MeshData): MeshType {
    return Mesh.detectTypeStatic(data);
  }

  /**
   * Static type detection for use before instance creation
   *
   * Detection logic:
   * 1. First determine vertex dimension from vertices array and max vertex index
   * 2. Then determine cell size from cells array
   * 3. Combine to determine mesh type:
   *    - 2D vertices + triangles → Mesh2D
   *    - 3D vertices + tetrahedra → Mesh3D
   *    - 3D vertices + triangles → MeshS
   */
  private static detectTypeStatic(data: MeshData): MeshType {
    const { vertices, cells } = data;

    if (vertices.length === 0 || cells.length === 0) {
      throw new Error(
        "Cannot detect mesh type from empty vertices or cells array",
      );
    }

    // Get max vertex index (1-indexed in MMG)
    const maxVertexIndex = Math.max(...cells);

    // Determine vertex dimension
    // vertices.length = nVertices * dimension
    // So dimension = vertices.length / nVertices
    const vertexDim = vertices.length / maxVertexIndex;

    // Check if it's exactly 2 or 3
    if (Math.abs(vertexDim - 2) < 0.01) {
      // 2D mesh
      return MeshType.Mesh2D;
    }

    if (Math.abs(vertexDim - 3) < 0.01) {
      // 3D mesh - now determine if volume (tetrahedra) or surface (triangles)
      const cellSize = Mesh.guessCellSize(cells, maxVertexIndex);
      if (cellSize === 4) {
        return MeshType.Mesh3D;
      }
      return MeshType.MeshS;
    }

    throw new Error(
      `Cannot auto-detect mesh type: computed vertexDim=${vertexDim.toFixed(2)}`,
    );
  }

  /**
   * Guess cell size (3 for triangles, 4 for tetrahedra)
   *
   * Uses Euler characteristic for closed meshes:
   * - For tetrahedra: approximately 6 * nVertices tetrahedra for a unit cube
   * - For triangles: approximately 2 * nVertices triangles for a closed surface
   */
  private static guessCellSize(cells: Int32Array, nVertices: number): number {
    const len = cells.length;

    // If only divisible by one, easy choice
    if (len % 4 === 0 && len % 3 !== 0) {
      return 4;
    }
    if (len % 3 === 0 && len % 4 !== 0) {
      return 3;
    }
    if (len % 3 !== 0 && len % 4 !== 0) {
      throw new Error(`Cell array length ${len} is not divisible by 3 or 4`);
    }

    // Divisible by both 3 and 4 (e.g., 24 = 6*4 = 8*3)
    // Use mesh topology heuristics
    const nCells4 = len / 4;
    const nCells3 = len / 3;

    // For a tetrahedral mesh, we typically have:
    // - nTet ≈ 5-6 * nVertices for a refined mesh
    // - nTet can be less for coarse meshes
    // For a triangulated surface:
    // - nTri ≈ 2 * nVertices for a closed surface (Euler formula)
    // - nTri ≈ nVertices for an open surface

    // Check which interpretation gives a more reasonable ratio
    const ratio4 = nCells4 / nVertices;
    const ratio3 = nCells3 / nVertices;

    // Tetrahedra typically have ratio 0.5-6
    // Triangles typically have ratio 0.5-3
    // The key insight: if interpreting as tetrahedra gives a ratio < 1,
    // that's unusual (more vertices than cells) - likely triangles
    // If ratio3 > 3, that's also unusual for triangles

    // For the cube example: 8 vertices, 24 indices
    // As tetrahedra: 6 cells, ratio = 0.75
    // As triangles: 8 cells, ratio = 1.0
    // A cube decomposed into 6 tetrahedra is valid (ratio 0.75)
    // A cube surface has 12 triangles, not 8

    // Better heuristic: check if the number of cells makes sense
    // A minimal tetrahedron has 4 vertices, 1 cell (ratio 0.25)
    // A minimal triangulated surface has 4 vertices, 4 triangles (ratio 1.0)

    // If we have significantly fewer cells than vertices when interpreting
    // as tetrahedra, it's likely tetrahedra (ratio4 < 1 is common for coarse meshes)
    if (ratio4 <= 1.0) {
      return 4;
    }

    // If the tetrahedra interpretation gives many cells per vertex,
    // and triangle interpretation is reasonable, use triangles
    if (ratio3 <= 3.0) {
      return 3;
    }

    // Default to tetrahedra for ambiguous cases with many cells
    return 4;
  }

  /**
   * Detect mesh type from file buffer content
   */
  private static async detectTypeFromBuffer(
    buffer: Uint8Array,
  ): Promise<MeshType> {
    // Check file header for hints
    const text = new TextDecoder("utf-8", { fatal: false }).decode(
      buffer.slice(0, 1000),
    );

    // Look for Dimension keyword in Medit format
    const dimMatch = text.match(/Dimension\s+(\d+)/i);
    if (dimMatch) {
      const dim = Number.parseInt(dimMatch[1], 10);
      if (dim === 2) {
        return MeshType.Mesh2D;
      }
      // For 3D, check if there are Tetrahedra or just Triangles
      if (text.match(/Tetrahedra/i)) {
        return MeshType.Mesh3D;
      }
      return MeshType.MeshS;
    }

    // Binary format - check magic number and dimension field
    if (buffer.length >= 8) {
      const view = new DataView(buffer.buffer, buffer.byteOffset);
      // Medit binary magic: 1 for version
      const magic = view.getInt32(0, true);
      if (magic === 1) {
        // Next 4 bytes might be dimension
        const dim = view.getInt32(4, true);
        if (dim === 2) return MeshType.Mesh2D;
        if (dim === 3) {
          // Would need to scan file to determine if surface or volume
          // Default to surface as it's more common for imports
          return MeshType.MeshS;
        }
      }
    }

    // Default to 3D surface mesh
    return MeshType.MeshS;
  }

  /**
   * Create internal MMG handle
   */
  private createHandle(): MeshHandle | MeshHandle2D | MeshHandleS {
    switch (this._type) {
      case MeshType.Mesh2D: {
        const handle = MMG2D.init();
        MMG2D.setIParam(handle, IPARAM_2D.verbose, -1);
        return handle;
      }
      case MeshType.Mesh3D: {
        const handle = MMG3D.init();
        MMG3D.setIParam(handle, IPARAM.verbose, -1);
        return handle;
      }
      case MeshType.MeshS: {
        const handle = MMGS.init();
        MMGS.setIParam(handle, IPARAM_S.verbose, -1);
        return handle;
      }
      default:
        throw new Error(`Unknown mesh type: ${this._type}`);
    }
  }

  /**
   * Set mesh data from MeshData input
   */
  private setData(data: MeshData): void {
    const { vertices, cells, boundaryFaces, vertexRefs, cellRefs } = data;

    // Skip if empty data (for load() path)
    if (vertices.length === 0 && cells.length === 0) {
      return;
    }

    switch (this._type) {
      case MeshType.Mesh2D:
        this.setData2D(vertices, cells, boundaryFaces, vertexRefs, cellRefs);
        break;
      case MeshType.Mesh3D:
        this.setData3D(vertices, cells, boundaryFaces, vertexRefs, cellRefs);
        break;
      case MeshType.MeshS:
        this.setDataS(vertices, cells, boundaryFaces, vertexRefs, cellRefs);
        break;
    }
  }

  private setData2D(
    vertices: Float64Array,
    cells: Int32Array,
    boundaryFaces?: Int32Array,
    _vertexRefs?: Int32Array,
    _cellRefs?: Int32Array,
  ): void {
    const handle = this._handle as MeshHandle2D;
    const nVertices = vertices.length / 2;
    const nTriangles = cells.length / 3;
    const nEdges = boundaryFaces ? boundaryFaces.length / 2 : 0;

    MMG2D.setMeshSize(handle, nVertices, nTriangles, 0, nEdges);
    MMG2D.setVertices(handle, vertices);
    MMG2D.setTriangles(handle, cells);

    if (boundaryFaces && boundaryFaces.length > 0) {
      MMG2D.setEdges(handle, boundaryFaces);
    }
  }

  private setData3D(
    vertices: Float64Array,
    cells: Int32Array,
    boundaryFaces?: Int32Array,
    _vertexRefs?: Int32Array,
    _cellRefs?: Int32Array,
  ): void {
    const handle = this._handle as MeshHandle;
    const nVertices = vertices.length / 3;
    const nTetrahedra = cells.length / 4;
    const nTriangles = boundaryFaces ? boundaryFaces.length / 3 : 0;

    MMG3D.setMeshSize(handle, nVertices, nTetrahedra, 0, nTriangles, 0, 0);
    MMG3D.setVertices(handle, vertices);
    MMG3D.setTetrahedra(handle, cells);

    if (boundaryFaces && boundaryFaces.length > 0) {
      MMG3D.setTriangles(handle, boundaryFaces);
    }
  }

  private setDataS(
    vertices: Float64Array,
    cells: Int32Array,
    boundaryFaces?: Int32Array,
    _vertexRefs?: Int32Array,
    _cellRefs?: Int32Array,
  ): void {
    const handle = this._handle as MeshHandleS;
    const nVertices = vertices.length / 3;
    const nTriangles = cells.length / 3;
    const nEdges = boundaryFaces ? boundaryFaces.length / 2 : 0;

    MMGS.setMeshSize(handle, nVertices, nTriangles, nEdges);
    MMGS.setVertices(handle, vertices);
    MMGS.setTriangles(handle, cells);

    if (boundaryFaces && boundaryFaces.length > 0) {
      MMGS.setEdges(handle, boundaryFaces);
    }
  }

  /**
   * Load mesh from file into the current handle
   */
  private loadFromFile(filename: string): void {
    switch (this._type) {
      case MeshType.Mesh2D:
        MMG2D.loadMesh(this._handle as MeshHandle2D, filename);
        break;
      case MeshType.Mesh3D:
        MMG3D.loadMesh(this._handle as MeshHandle, filename);
        break;
      case MeshType.MeshS:
        MMGS.loadMesh(this._handle as MeshHandleS, filename);
        break;
    }
  }

  /**
   * Get mesh size from internal handle
   */
  private getMeshSize(): MeshSize | MeshSize2D | MeshSizeS {
    switch (this._type) {
      case MeshType.Mesh2D:
        return MMG2D.getMeshSize(this._handle as MeshHandle2D);
      case MeshType.Mesh3D:
        return MMG3D.getMeshSize(this._handle as MeshHandle);
      case MeshType.MeshS:
        return MMGS.getMeshSize(this._handle as MeshHandleS);
      default:
        throw new Error(`Unknown mesh type: ${this._type}`);
    }
  }

  /**
   * Get the appropriate filesystem for the mesh type
   */
  private static getFS(type: MeshType): EmscriptenFS {
    switch (type) {
      case MeshType.Mesh2D:
        return getFS2D();
      case MeshType.Mesh3D:
        return getFS();
      case MeshType.MeshS:
        return getFSS();
      default:
        throw new Error(`Unknown mesh type: ${type}`);
    }
  }
}
