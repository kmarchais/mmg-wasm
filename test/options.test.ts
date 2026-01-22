import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { MeshType } from "../src/mesh";
import { MMG2D, type MeshHandle2D, initMMG2D } from "../src/mmg2d";
import { MMG3D, type MeshHandle, initMMG3D } from "../src/mmg3d";
import { MMGS, type MeshHandleS, initMMGS } from "../src/mmgs";
import {
  type RemeshOptions,
  RemeshOptionsError,
  RemeshPresets,
  applyOptions,
  validateOptions,
} from "../src/options";

describe("RemeshOptions Validation", () => {
  describe("hmin/hmax constraints", () => {
    it("throws when hmin > hmax", () => {
      const options: RemeshOptions = { hmin: 0.5, hmax: 0.1 };
      expect(() => validateOptions(options)).toThrow(RemeshOptionsError);
      expect(() => validateOptions(options)).toThrow("hmin must be <= hmax");
    });

    it("allows hmin === hmax", () => {
      const options: RemeshOptions = { hmin: 0.1, hmax: 0.1 };
      expect(() => validateOptions(options)).not.toThrow();
    });

    it("allows hmin < hmax", () => {
      const options: RemeshOptions = { hmin: 0.01, hmax: 0.5 };
      expect(() => validateOptions(options)).not.toThrow();
    });

    it("throws when hmin <= 0", () => {
      expect(() => validateOptions({ hmin: 0 })).toThrow(
        "hmin must be positive",
      );
      expect(() => validateOptions({ hmin: -0.1 })).toThrow(
        "hmin must be positive",
      );
    });

    it("throws when hmax <= 0", () => {
      expect(() => validateOptions({ hmax: 0 })).toThrow(
        "hmax must be positive",
      );
      expect(() => validateOptions({ hmax: -0.1 })).toThrow(
        "hmax must be positive",
      );
    });
  });

  describe("hsiz constraints", () => {
    it("throws when hsiz <= 0", () => {
      expect(() => validateOptions({ hsiz: 0 })).toThrow(
        "hsiz must be positive",
      );
      expect(() => validateOptions({ hsiz: -0.1 })).toThrow(
        "hsiz must be positive",
      );
    });

    it("allows positive hsiz", () => {
      expect(() => validateOptions({ hsiz: 0.1 })).not.toThrow();
    });
  });

  describe("hausd constraints", () => {
    it("throws when hausd <= 0", () => {
      expect(() => validateOptions({ hausd: 0 })).toThrow(
        "hausd must be positive",
      );
      expect(() => validateOptions({ hausd: -0.001 })).toThrow(
        "hausd must be positive",
      );
    });

    it("allows positive hausd", () => {
      expect(() => validateOptions({ hausd: 0.001 })).not.toThrow();
    });
  });

  describe("hgrad constraints", () => {
    it("throws when hgrad < 1.0", () => {
      expect(() => validateOptions({ hgrad: 0.9 })).toThrow(
        "hgrad must be between 1.0 and 2.0",
      );
    });

    it("throws when hgrad > 2.0", () => {
      expect(() => validateOptions({ hgrad: 2.1 })).toThrow(
        "hgrad must be between 1.0 and 2.0",
      );
    });

    it("allows hgrad at boundaries", () => {
      expect(() => validateOptions({ hgrad: 1.0 })).not.toThrow();
      expect(() => validateOptions({ hgrad: 2.0 })).not.toThrow();
    });

    it("allows hgrad within range", () => {
      expect(() => validateOptions({ hgrad: 1.3 })).not.toThrow();
      expect(() => validateOptions({ hgrad: 1.5 })).not.toThrow();
    });
  });

  describe("angleDetection constraints", () => {
    it("throws when angleDetection < 0", () => {
      expect(() => validateOptions({ angleDetection: -1 })).toThrow(
        "angleDetection must be between 0 and 180 degrees",
      );
    });

    it("throws when angleDetection > 180", () => {
      expect(() => validateOptions({ angleDetection: 181 })).toThrow(
        "angleDetection must be between 0 and 180 degrees",
      );
    });

    it("allows angleDetection at boundaries", () => {
      expect(() => validateOptions({ angleDetection: 0 })).not.toThrow();
      expect(() => validateOptions({ angleDetection: 180 })).not.toThrow();
    });

    it("allows angleDetection within range", () => {
      expect(() => validateOptions({ angleDetection: 45 })).not.toThrow();
      expect(() => validateOptions({ angleDetection: 90 })).not.toThrow();
    });
  });

  describe("verbose constraints", () => {
    it("throws when verbose < -1", () => {
      expect(() => validateOptions({ verbose: -2 })).toThrow(
        "verbose must be an integer between -1 and 10",
      );
    });

    it("throws when verbose > 10", () => {
      expect(() => validateOptions({ verbose: 11 })).toThrow(
        "verbose must be an integer between -1 and 10",
      );
    });

    it("throws when verbose is not an integer", () => {
      expect(() => validateOptions({ verbose: 1.5 })).toThrow(
        "verbose must be an integer between -1 and 10",
      );
    });

    it("allows verbose at boundaries", () => {
      expect(() => validateOptions({ verbose: -1 })).not.toThrow();
      expect(() => validateOptions({ verbose: 10 })).not.toThrow();
    });

    it("allows verbose within range", () => {
      expect(() => validateOptions({ verbose: 0 })).not.toThrow();
      expect(() => validateOptions({ verbose: 5 })).not.toThrow();
    });
  });

  describe("empty options", () => {
    it("allows empty options object", () => {
      expect(() => validateOptions({})).not.toThrow();
    });
  });

  describe("NaN constraints", () => {
    it("throws when hmin is NaN", () => {
      expect(() => validateOptions({ hmin: Number.NaN })).toThrow(
        "hmin must not be NaN",
      );
    });

    it("throws when hmax is NaN", () => {
      expect(() => validateOptions({ hmax: Number.NaN })).toThrow(
        "hmax must not be NaN",
      );
    });

    it("throws when hsiz is NaN", () => {
      expect(() => validateOptions({ hsiz: Number.NaN })).toThrow(
        "hsiz must not be NaN",
      );
    });

    it("throws when hausd is NaN", () => {
      expect(() => validateOptions({ hausd: Number.NaN })).toThrow(
        "hausd must not be NaN",
      );
    });

    it("throws when hgrad is NaN", () => {
      expect(() => validateOptions({ hgrad: Number.NaN })).toThrow(
        "hgrad must not be NaN",
      );
    });

    it("throws when angleDetection is NaN", () => {
      expect(() => validateOptions({ angleDetection: Number.NaN })).toThrow(
        "angleDetection must not be NaN",
      );
    });

    it("throws when verbose is NaN", () => {
      expect(() => validateOptions({ verbose: Number.NaN })).toThrow(
        "verbose must not be NaN",
      );
    });
  });
});

describe("RemeshPresets", () => {
  describe("fine()", () => {
    it("returns expected values", () => {
      const preset = RemeshPresets.fine();
      expect(preset.hmax).toBe(0.01);
      expect(preset.hausd).toBe(0.0001);
      expect(preset.hgrad).toBe(1.1);
      expect(preset.verbose).toBe(-1);
    });

    it("passes validation", () => {
      expect(() => validateOptions(RemeshPresets.fine())).not.toThrow();
    });
  });

  describe("coarse()", () => {
    it("returns expected values", () => {
      const preset = RemeshPresets.coarse();
      expect(preset.hmax).toBe(0.5);
      expect(preset.hausd).toBe(0.01);
      expect(preset.hgrad).toBe(1.5);
      expect(preset.verbose).toBe(-1);
    });

    it("passes validation", () => {
      expect(() => validateOptions(RemeshPresets.coarse())).not.toThrow();
    });
  });

  describe("default()", () => {
    it("returns expected values", () => {
      const preset = RemeshPresets.default();
      expect(preset.hgrad).toBe(1.3);
      expect(preset.hausd).toBe(0.01);
      expect(preset.verbose).toBe(-1);
    });

    it("passes validation", () => {
      expect(() => validateOptions(RemeshPresets.default())).not.toThrow();
    });
  });

  describe("optimizeOnly()", () => {
    it("returns expected values", () => {
      const preset = RemeshPresets.optimizeOnly();
      expect(preset.optim).toBe(true);
      expect(preset.verbose).toBe(-1);
    });

    it("passes validation", () => {
      expect(() => validateOptions(RemeshPresets.optimizeOnly())).not.toThrow();
    });
  });

  describe("noInsertions()", () => {
    it("returns expected values", () => {
      const preset = RemeshPresets.noInsertions();
      expect(preset.noinsert).toBe(true);
      expect(preset.verbose).toBe(-1);
    });

    it("passes validation", () => {
      expect(() => validateOptions(RemeshPresets.noInsertions())).not.toThrow();
    });
  });

  describe("preset extension", () => {
    it("allows combining preset with overrides", () => {
      const options = { ...RemeshPresets.fine(), verbose: 1 };
      expect(options.hmax).toBe(0.01);
      expect(options.verbose).toBe(1);
      expect(() => validateOptions(options)).not.toThrow();
    });

    it("allows overriding all values", () => {
      const options = {
        ...RemeshPresets.fine(),
        hmax: 0.1,
        hausd: 0.001,
        hgrad: 1.3,
        verbose: 0,
      };
      expect(options.hmax).toBe(0.1);
      expect(options.hausd).toBe(0.001);
      expect(options.hgrad).toBe(1.3);
      expect(options.verbose).toBe(0);
    });
  });
});

describe("applyOptions", () => {
  const handles3D: MeshHandle[] = [];
  const handles2D: MeshHandle2D[] = [];
  const handlesS: MeshHandleS[] = [];

  beforeAll(async () => {
    await Promise.all([initMMG3D(), initMMG2D(), initMMGS()]);
  });

  afterEach(() => {
    for (const handle of handles3D) {
      try {
        MMG3D.free(handle);
      } catch {
        // Ignore errors
      }
    }
    handles3D.length = 0;

    for (const handle of handles2D) {
      try {
        MMG2D.free(handle);
      } catch {
        // Ignore errors
      }
    }
    handles2D.length = 0;

    for (const handle of handlesS) {
      try {
        MMGS.free(handle);
      } catch {
        // Ignore errors
      }
    }
    handlesS.length = 0;
  });

  describe("validation", () => {
    it("throws for invalid options", () => {
      const handle = MMG3D.init();
      handles3D.push(handle);

      const invalidOptions = { hmin: 0.5, hmax: 0.1 };
      expect(() =>
        applyOptions(handle, MeshType.Mesh3D, invalidOptions),
      ).toThrow(RemeshOptionsError);
    });
  });

  describe("MMG3D integration", () => {
    it("applies options without throwing", () => {
      const handle = MMG3D.init();
      handles3D.push(handle);

      const options: RemeshOptions = {
        hmin: 0.01,
        hmax: 0.5,
        hausd: 0.001,
        hgrad: 1.3,
        verbose: -1,
      };

      expect(() =>
        applyOptions(handle, MeshType.Mesh3D, options),
      ).not.toThrow();
    });

    it("applies preset options", () => {
      const handle = MMG3D.init();
      handles3D.push(handle);

      expect(() =>
        applyOptions(handle, MeshType.Mesh3D, RemeshPresets.fine()),
      ).not.toThrow();
    });

    it("applies boolean flags", () => {
      const handle = MMG3D.init();
      handles3D.push(handle);

      const options: RemeshOptions = {
        optim: true,
        noinsert: true,
        noswap: true,
        nomove: true,
        debug: true,
        verbose: -1,
      };

      expect(() =>
        applyOptions(handle, MeshType.Mesh3D, options),
      ).not.toThrow();
    });
  });

  describe("MMG2D integration", () => {
    it("applies options without throwing", () => {
      const handle = MMG2D.init();
      handles2D.push(handle);

      const options: RemeshOptions = {
        hmin: 0.01,
        hmax: 0.5,
        hausd: 0.001,
        hgrad: 1.3,
        verbose: -1,
      };

      expect(() =>
        applyOptions(handle, MeshType.Mesh2D, options),
      ).not.toThrow();
    });

    it("applies preset options", () => {
      const handle = MMG2D.init();
      handles2D.push(handle);

      expect(() =>
        applyOptions(handle, MeshType.Mesh2D, RemeshPresets.coarse()),
      ).not.toThrow();
    });
  });

  describe("MMGS integration", () => {
    it("applies options without throwing", () => {
      const handle = MMGS.init();
      handlesS.push(handle);

      const options: RemeshOptions = {
        hmin: 0.01,
        hmax: 0.5,
        hausd: 0.001,
        hgrad: 1.3,
        verbose: -1,
      };

      expect(() => applyOptions(handle, MeshType.MeshS, options)).not.toThrow();
    });

    it("applies preset options", () => {
      const handle = MMGS.init();
      handlesS.push(handle);

      expect(() =>
        applyOptions(handle, MeshType.MeshS, RemeshPresets.default()),
      ).not.toThrow();
    });
  });

  describe("empty options", () => {
    it("applies empty options without throwing", () => {
      const handle = MMG3D.init();
      handles3D.push(handle);

      expect(() => applyOptions(handle, MeshType.Mesh3D, {})).not.toThrow();
    });
  });
});
