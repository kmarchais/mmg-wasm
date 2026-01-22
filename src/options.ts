/**
 * RemeshOptions - Type-safe options for mesh remeshing
 *
 * Provides a convenient interface for controlling MMG remeshing behavior
 * with sensible defaults and presets for common use cases.
 */

import { DPARAM, IPARAM, MMG3D, type MeshHandle } from "./mmg3d";
import { DPARAM_2D, IPARAM_2D, MMG2D, type MeshHandle2D } from "./mmg2d";
import { DPARAM_S, IPARAM_S, MMGS, type MeshHandleS } from "./mmgs";
import { MeshType } from "./mesh";

/**
 * Options for controlling mesh remeshing behavior
 *
 * @example
 * ```typescript
 * // Using options object
 * const options: RemeshOptions = {
 *   hmax: 0.1,
 *   hmin: 0.01,
 *   hausd: 0.001,
 *   hgrad: 1.3,
 *   verbose: -1,
 * };
 *
 * // Using presets
 * const fine = RemeshPresets.fine();
 * const coarse = RemeshPresets.coarse();
 *
 * // Combining preset with overrides
 * const custom = {
 *   ...RemeshPresets.fine(),
 *   verbose: 1,
 * };
 * ```
 */
export interface RemeshOptions {
  // =====================
  // Size parameters
  // =====================

  /**
   * Minimum edge size
   *
   * Edges shorter than this will be collapsed during remeshing.
   * If not specified, MMG computes this automatically.
   */
  hmin?: number;

  /**
   * Maximum edge size
   *
   * Edges longer than this will be split during remeshing.
   * If not specified, MMG computes this automatically.
   */
  hmax?: number;

  /**
   * Constant edge size
   *
   * Forces all edges to have approximately this length.
   * Overrides hmin and hmax when specified.
   */
  hsiz?: number;

  /**
   * Hausdorff distance for surface approximation
   *
   * Controls how closely the remeshed surface follows the original geometry.
   * Smaller values preserve more detail but produce more elements.
   * @default 0.01
   */
  hausd?: number;

  /**
   * Gradation parameter
   *
   * Controls how quickly element sizes can change across the mesh.
   * A value of 1.3 means adjacent edges can differ by 30% in size.
   * @minimum 1.0
   * @maximum 2.0
   * @default 1.3
   */
  hgrad?: number;

  // =====================
  // Quality parameters
  // =====================

  /**
   * Ridge angle detection threshold in degrees
   *
   * Angles sharper than this are treated as geometric features
   * and preserved during remeshing.
   * @default 45
   */
  angleDetection?: number;

  // =====================
  // Behavior flags
  // =====================

  /**
   * Optimization only mode
   *
   * When enabled, improves mesh quality without changing topology.
   * No edges will be inserted or collapsed.
   * @default false
   */
  optim?: boolean;

  /**
   * Disable vertex insertion
   *
   * When enabled, no new vertices will be added to the mesh.
   * @default false
   */
  noinsert?: boolean;

  /**
   * Disable edge/face swapping
   *
   * When enabled, edges (2D) or faces (3D) will not be flipped.
   * @default false
   */
  noswap?: boolean;

  /**
   * Disable vertex relocation
   *
   * When enabled, existing vertices will not be moved.
   * @default false
   */
  nomove?: boolean;

  // =====================
  // Output control
  // =====================

  /**
   * Verbosity level
   *
   * Controls the amount of output from MMG:
   * - -1: Silent (no output)
   * - 0: Minimal output
   * - 1-10: Increasing detail (10 = debug)
   * @minimum -1
   * @maximum 10
   * @default -1
   */
  verbose?: number;

  /**
   * Enable debug mode
   *
   * Outputs additional debugging information.
   * @default false
   */
  debug?: boolean;
}

/**
 * Validation error for RemeshOptions
 */
export class RemeshOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RemeshOptionsError";
  }
}

/**
 * Validate RemeshOptions
 *
 * Checks that all provided options are within valid ranges and consistent.
 *
 * @param options - Options to validate
 * @throws RemeshOptionsError if any option is invalid
 */
export function validateOptions(options: RemeshOptions): void {
  // Check for NaN values in numeric fields
  const numericFields: (keyof RemeshOptions)[] = [
    "hmin",
    "hmax",
    "hsiz",
    "hausd",
    "hgrad",
    "angleDetection",
    "verbose",
  ];
  for (const field of numericFields) {
    const value = options[field];
    if (
      value !== undefined &&
      typeof value === "number" &&
      Number.isNaN(value)
    ) {
      throw new RemeshOptionsError(`${field} must not be NaN`);
    }
  }

  if (options.hmin !== undefined && options.hmax !== undefined) {
    if (options.hmin > options.hmax) {
      throw new RemeshOptionsError("hmin must be <= hmax");
    }
  }

  if (options.hmin !== undefined && options.hmin <= 0) {
    throw new RemeshOptionsError("hmin must be positive");
  }

  if (options.hmax !== undefined && options.hmax <= 0) {
    throw new RemeshOptionsError("hmax must be positive");
  }

  if (options.hsiz !== undefined && options.hsiz <= 0) {
    throw new RemeshOptionsError("hsiz must be positive");
  }

  if (options.hausd !== undefined && options.hausd <= 0) {
    throw new RemeshOptionsError("hausd must be positive");
  }

  if (options.hgrad !== undefined) {
    if (options.hgrad < 1.0 || options.hgrad > 2.0) {
      throw new RemeshOptionsError("hgrad must be between 1.0 and 2.0");
    }
  }

  if (options.angleDetection !== undefined) {
    if (options.angleDetection < 0 || options.angleDetection > 180) {
      throw new RemeshOptionsError(
        "angleDetection must be between 0 and 180 degrees",
      );
    }
  }

  if (options.verbose !== undefined) {
    if (
      !Number.isInteger(options.verbose) ||
      options.verbose < -1 ||
      options.verbose > 10
    ) {
      throw new RemeshOptionsError(
        "verbose must be an integer between -1 and 10",
      );
    }
  }
}

/**
 * Preset factory for common remeshing configurations
 *
 * @example
 * ```typescript
 * // Fine mesh with tight geometric approximation
 * const fine = RemeshPresets.fine();
 *
 * // Coarse mesh for fast processing
 * const coarse = RemeshPresets.coarse();
 *
 * // Optimization only (no topology changes)
 * const optimize = RemeshPresets.optimizeOnly();
 *
 * // Combine with overrides
 * const custom = { ...RemeshPresets.fine(), verbose: 1 };
 * ```
 */
export const RemeshPresets = {
  /**
   * Fine mesh with tight geometric approximation
   *
   * Produces a high-quality mesh with:
   * - Small maximum edge size (0.01)
   * - Tight Hausdorff distance (0.0001)
   * - Gradual size transitions (1.1)
   */
  fine(): RemeshOptions {
    return {
      hmax: 0.01,
      hausd: 0.0001,
      hgrad: 1.1,
      verbose: -1,
    };
  },

  /**
   * Coarse mesh for fast processing
   *
   * Produces a simplified mesh with:
   * - Large maximum edge size (0.5)
   * - Relaxed Hausdorff distance (0.01)
   * - Faster size transitions (1.5)
   */
  coarse(): RemeshOptions {
    return {
      hmax: 0.5,
      hausd: 0.01,
      hgrad: 1.5,
      verbose: -1,
    };
  },

  /**
   * Default balanced settings
   *
   * Good general-purpose configuration with:
   * - Moderate gradation (1.3)
   * - Standard Hausdorff distance (0.01)
   * - Automatic size computation
   */
  default(): RemeshOptions {
    return {
      hgrad: 1.3,
      hausd: 0.01,
      verbose: -1,
    };
  },

  /**
   * Optimization only mode
   *
   * Improves mesh quality without changing topology:
   * - No edge insertion or collapse
   * - Only vertex relocation and swapping
   */
  optimizeOnly(): RemeshOptions {
    return {
      optim: true,
      verbose: -1,
    };
  },

  /**
   * No insertions mode
   *
   * Improves existing mesh without adding vertices:
   * - No new vertices inserted
   * - Allows edge collapse, swapping, and relocation
   */
  noInsertions(): RemeshOptions {
    return {
      noinsert: true,
      verbose: -1,
    };
  },
};

/**
 * Apply RemeshOptions to an MMG handle
 *
 * Maps the high-level options to the corresponding MMG parameters
 * for the specified mesh type.
 *
 * @param handle - MMG mesh handle
 * @param type - Mesh type (determines which MMG library to use)
 * @param options - Remeshing options to apply
 * @throws RemeshOptionsError if options are invalid
 *
 * @internal
 */
export function applyOptions(
  handle: MeshHandle | MeshHandle2D | MeshHandleS,
  type: MeshType,
  options: RemeshOptions,
): void {
  // Validate first
  validateOptions(options);

  // Get the appropriate setters based on mesh type
  const setD =
    type === MeshType.Mesh2D
      ? (param: number, value: number) =>
          MMG2D.setDParam(handle as MeshHandle2D, param, value)
      : type === MeshType.MeshS
        ? (param: number, value: number) =>
            MMGS.setDParam(handle as MeshHandleS, param, value)
        : (param: number, value: number) =>
            MMG3D.setDParam(handle as MeshHandle, param, value);

  const setI =
    type === MeshType.Mesh2D
      ? (param: number, value: number) =>
          MMG2D.setIParam(handle as MeshHandle2D, param, value)
      : type === MeshType.MeshS
        ? (param: number, value: number) =>
            MMGS.setIParam(handle as MeshHandleS, param, value)
        : (param: number, value: number) =>
            MMG3D.setIParam(handle as MeshHandle, param, value);

  // Get the appropriate parameter constants
  const dparam =
    type === MeshType.Mesh2D
      ? DPARAM_2D
      : type === MeshType.MeshS
        ? DPARAM_S
        : DPARAM;

  const iparam =
    type === MeshType.Mesh2D
      ? IPARAM_2D
      : type === MeshType.MeshS
        ? IPARAM_S
        : IPARAM;

  // Apply double parameters
  if (options.hmin !== undefined) {
    setD(dparam.hmin, options.hmin);
  }
  if (options.hmax !== undefined) {
    setD(dparam.hmax, options.hmax);
  }
  if (options.hsiz !== undefined) {
    setD(dparam.hsiz, options.hsiz);
  }
  if (options.hausd !== undefined) {
    setD(dparam.hausd, options.hausd);
  }
  if (options.hgrad !== undefined) {
    setD(dparam.hgrad, options.hgrad);
  }
  if (options.angleDetection !== undefined) {
    setD(dparam.angleDetection, options.angleDetection);
  }

  // Apply integer parameters
  if (options.optim) {
    setI(iparam.optim, 1);
  }
  if (options.noinsert) {
    setI(iparam.noinsert, 1);
  }
  if (options.noswap) {
    setI(iparam.noswap, 1);
  }
  if (options.nomove) {
    setI(iparam.nomove, 1);
  }
  if (options.verbose !== undefined) {
    setI(iparam.verbose, options.verbose);
  }
  if (options.debug) {
    setI(iparam.debug, 1);
  }
}
