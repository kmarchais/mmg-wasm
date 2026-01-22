import { describe, expect, it, beforeAll, afterEach } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  initMMG3D,
  MMG3D,
  getFS,
  IPARAM,
  type MeshHandle,
} from "../src/mmg3d";
import {
  initMMG2D,
  MMG2D,
  getFS2D,
  IPARAM_2D,
  type MeshHandle2D,
} from "../src/mmg2d";
import {
  initMMGS,
  MMGS,
  getFSS,
  IPARAM_S,
  type MeshHandleS,
} from "../src/mmgs";

describe("File I/O", () => {
  describe("MMG3D File I/O", () => {
    const handles: MeshHandle[] = [];

    beforeAll(async () => {
      await initMMG3D();
    });

    afterEach(() => {
      const FS = getFS();
      for (const handle of handles) {
        try {
          MMG3D.free(handle);
        } catch {
          // Ignore errors from already-freed handles
        }
      }
      handles.length = 0;

      // Clean up virtual filesystem
      try {
        FS.unlink("/test.mesh");
      } catch {
        // File may not exist
      }
      try {
        FS.unlink("/output.mesh");
      } catch {
        // File may not exist
      }
      try {
        FS.unlink("/cube.mesh");
      } catch {
        // File may not exist
      }
    });

    it("should load and save mesh files (round-trip)", () => {
      const FS = getFS();

      // Create a simple tetrahedron mesh programmatically
      const handle = MMG3D.init();
      handles.push(handle);

      // Silence output
      MMG3D.setIParam(handle, IPARAM.verbose, -1);

      // Set up a tetrahedron (4 vertices, 1 tetrahedron, 4 triangles)
      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      // Set vertices
      const vertices = new Float64Array([
        0, 0, 0,
        1, 0, 0,
        0.5, Math.sqrt(3) / 2, 0,
        0.5, Math.sqrt(3) / 6, Math.sqrt(2 / 3),
      ]);
      MMG3D.setVertices(handle, vertices);

      // Set tetrahedron (1-indexed)
      const tetrahedra = new Int32Array([1, 2, 3, 4]);
      MMG3D.setTetrahedra(handle, tetrahedra);

      // Set boundary triangles
      const triangles = new Int32Array([
        1, 2, 3,
        1, 2, 4,
        2, 3, 4,
        3, 1, 4,
      ]);
      MMG3D.setTriangles(handle, triangles);

      // Save mesh to virtual filesystem
      MMG3D.saveMesh(handle, "/test.mesh");

      // Verify file exists
      const analysis = FS.analyzePath("/test.mesh");
      expect(analysis.exists).toBe(true);

      // Read file content
      const meshData = FS.readFile("/test.mesh", { encoding: "binary" });
      expect(meshData.length).toBeGreaterThan(0);

      // Load mesh into a new handle
      const handle2 = MMG3D.init();
      handles.push(handle2);
      MMG3D.setIParam(handle2, IPARAM.verbose, -1);

      MMG3D.loadMesh(handle2, "/test.mesh");

      // Verify loaded mesh has same structure
      const size = MMG3D.getMeshSize(handle2);
      expect(size.nVertices).toBe(4);
      expect(size.nTetrahedra).toBe(1);
      expect(size.nTriangles).toBe(4);
    });

    it("should load existing mesh file from fixture", () => {
      const FS = getFS();

      // Read cube.mesh from fixtures
      const cubeMeshPath = join(__dirname, "fixtures", "cube.mesh");
      const meshData = readFileSync(cubeMeshPath);

      // Write to virtual filesystem
      FS.writeFile("/cube.mesh", meshData);

      // Load mesh
      const handle = MMG3D.init();
      handles.push(handle);
      MMG3D.setIParam(handle, IPARAM.verbose, -1);

      MMG3D.loadMesh(handle, "/cube.mesh");

      // Verify mesh was loaded
      const size = MMG3D.getMeshSize(handle);
      expect(size.nVertices).toBeGreaterThan(0);
      expect(size.nTetrahedra).toBeGreaterThan(0);
    });

    it("should remesh loaded file and save result", () => {
      const FS = getFS();

      // Read cube.mesh from fixtures
      const cubeMeshPath = join(__dirname, "fixtures", "cube.mesh");
      const meshData = readFileSync(cubeMeshPath);

      // Write to virtual filesystem
      FS.writeFile("/cube.mesh", meshData);

      // Load mesh
      const handle = MMG3D.init();
      handles.push(handle);
      MMG3D.setIParam(handle, IPARAM.verbose, -1);

      MMG3D.loadMesh(handle, "/cube.mesh");

      const sizeBefore = MMG3D.getMeshSize(handle);

      // Run remeshing
      const result = MMG3D.mmg3dlib(handle);
      expect(result).toBe(0); // Success

      const sizeAfter = MMG3D.getMeshSize(handle);

      // Save result
      MMG3D.saveMesh(handle, "/output.mesh");

      // Verify output file exists and has content
      const outputData = FS.readFile("/output.mesh", { encoding: "binary" });
      expect(outputData.length).toBeGreaterThan(0);

      // Mesh should have changed (typically more elements after remeshing)
      expect(sizeAfter.nVertices).not.toBe(sizeBefore.nVertices);
    });

    it("should throw error for non-existent file", () => {
      const handle = MMG3D.init();
      handles.push(handle);
      MMG3D.setIParam(handle, IPARAM.verbose, -1);

      expect(() => MMG3D.loadMesh(handle, "/nonexistent.mesh")).toThrow();
    });

    it("should support binary mesh format (.meshb)", () => {
      const FS = getFS();

      // Create a simple mesh and save in binary format
      const handle = MMG3D.init();
      handles.push(handle);
      MMG3D.setIParam(handle, IPARAM.verbose, -1);

      MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

      const vertices = new Float64Array([
        0, 0, 0,
        1, 0, 0,
        0.5, 0.866, 0,
        0.5, 0.289, 0.816,
      ]);
      MMG3D.setVertices(handle, vertices);

      const tetrahedra = new Int32Array([1, 2, 3, 4]);
      MMG3D.setTetrahedra(handle, tetrahedra);

      const triangles = new Int32Array([
        1, 2, 3,
        1, 2, 4,
        2, 3, 4,
        3, 1, 4,
      ]);
      MMG3D.setTriangles(handle, triangles);

      // Save as binary format
      MMG3D.saveMesh(handle, "/test.meshb");

      // Verify binary file exists and is different from text format
      const binaryData = FS.readFile("/test.meshb", { encoding: "binary" });
      expect(binaryData.length).toBeGreaterThan(0);

      // Load binary format
      const handle2 = MMG3D.init();
      handles.push(handle2);
      MMG3D.setIParam(handle2, IPARAM.verbose, -1);

      MMG3D.loadMesh(handle2, "/test.meshb");

      const size = MMG3D.getMeshSize(handle2);
      expect(size.nVertices).toBe(4);
      expect(size.nTetrahedra).toBe(1);

      // Clean up
      FS.unlink("/test.meshb");
    });
  });

  describe("MMG2D File I/O", () => {
    const handles: MeshHandle2D[] = [];

    beforeAll(async () => {
      await initMMG2D();
    });

    afterEach(() => {
      const FS = getFS2D();
      for (const handle of handles) {
        try {
          MMG2D.free(handle);
        } catch {
          // Ignore errors from already-freed handles
        }
      }
      handles.length = 0;

      try {
        FS.unlink("/square.mesh");
      } catch {
        // File may not exist
      }
      try {
        FS.unlink("/output2d.mesh");
      } catch {
        // File may not exist
      }
    });

    it("should load and remesh 2D mesh file", () => {
      const FS = getFS2D();

      // Read square.mesh from fixtures
      const meshPath = join(__dirname, "fixtures", "square.mesh");
      const meshData = readFileSync(meshPath);

      // Write to virtual filesystem
      FS.writeFile("/square.mesh", meshData);

      // Load mesh
      const handle = MMG2D.init();
      handles.push(handle);
      MMG2D.setIParam(handle, IPARAM_2D.verbose, -1);

      MMG2D.loadMesh(handle, "/square.mesh");

      // Verify mesh was loaded
      const size = MMG2D.getMeshSize(handle);
      expect(size.nVertices).toBeGreaterThan(0);
      expect(size.nTriangles).toBeGreaterThan(0);

      // Run remeshing
      const result = MMG2D.mmg2dlib(handle);
      expect(result).toBe(0); // Success

      // Save result
      MMG2D.saveMesh(handle, "/output2d.mesh");

      // Verify output file exists
      const outputData = FS.readFile("/output2d.mesh", { encoding: "binary" });
      expect(outputData.length).toBeGreaterThan(0);
    });

    it("should do round-trip 2D mesh save/load", () => {
      const FS = getFS2D();

      // Create a simple 2D mesh (two triangles forming a square)
      const handle = MMG2D.init();
      handles.push(handle);
      MMG2D.setIParam(handle, IPARAM_2D.verbose, -1);

      // 4 vertices, 2 triangles, 4 boundary edges
      MMG2D.setMeshSize(handle, 4, 2, 0, 4);

      const vertices = new Float64Array([
        0, 0,
        1, 0,
        1, 1,
        0, 1,
      ]);
      MMG2D.setVertices(handle, vertices);

      const triangles = new Int32Array([
        1, 2, 3,
        1, 3, 4,
      ]);
      MMG2D.setTriangles(handle, triangles);

      const edges = new Int32Array([
        1, 2,
        2, 3,
        3, 4,
        4, 1,
      ]);
      MMG2D.setEdges(handle, edges);

      // Save mesh
      MMG2D.saveMesh(handle, "/square.mesh");

      // Load into new handle
      const handle2 = MMG2D.init();
      handles.push(handle2);
      MMG2D.setIParam(handle2, IPARAM_2D.verbose, -1);

      MMG2D.loadMesh(handle2, "/square.mesh");

      // Verify same structure
      const size = MMG2D.getMeshSize(handle2);
      expect(size.nVertices).toBe(4);
      expect(size.nTriangles).toBe(2);
      expect(size.nEdges).toBe(4);
    });
  });

  describe("MMGS File I/O", () => {
    const handles: MeshHandleS[] = [];

    beforeAll(async () => {
      await initMMGS();
    });

    afterEach(() => {
      const FS = getFSS();
      for (const handle of handles) {
        try {
          MMGS.free(handle);
        } catch {
          // Ignore errors from already-freed handles
        }
      }
      handles.length = 0;

      try {
        FS.unlink("/surface.mesh");
      } catch {
        // File may not exist
      }
      try {
        FS.unlink("/output_s.mesh");
      } catch {
        // File may not exist
      }
    });

    it("should load and remesh surface mesh file", () => {
      const FS = getFSS();

      // Read cube-surface.mesh from fixtures
      const meshPath = join(__dirname, "fixtures", "cube-surface.mesh");
      const meshData = readFileSync(meshPath);

      // Write to virtual filesystem
      FS.writeFile("/surface.mesh", meshData);

      // Load mesh
      const handle = MMGS.init();
      handles.push(handle);
      MMGS.setIParam(handle, IPARAM_S.verbose, -1);

      MMGS.loadMesh(handle, "/surface.mesh");

      // Verify mesh was loaded
      const size = MMGS.getMeshSize(handle);
      expect(size.nVertices).toBeGreaterThan(0);
      expect(size.nTriangles).toBeGreaterThan(0);

      // Run remeshing
      const result = MMGS.mmgslib(handle);
      expect(result).toBe(0); // Success

      // Save result
      MMGS.saveMesh(handle, "/output_s.mesh");

      // Verify output file exists
      const outputData = FS.readFile("/output_s.mesh", { encoding: "binary" });
      expect(outputData.length).toBeGreaterThan(0);
    });

    it("should do round-trip surface mesh save/load", () => {
      const FS = getFSS();

      // Create a simple surface mesh (tetrahedron surface = 4 triangles)
      const handle = MMGS.init();
      handles.push(handle);
      MMGS.setIParam(handle, IPARAM_S.verbose, -1);

      // 4 vertices, 4 triangles
      MMGS.setMeshSize(handle, 4, 4, 0);

      const vertices = new Float64Array([
        0, 0, 0,
        1, 0, 0,
        0.5, 0.866, 0,
        0.5, 0.289, 0.816,
      ]);
      MMGS.setVertices(handle, vertices);

      const triangles = new Int32Array([
        1, 2, 3,
        1, 2, 4,
        2, 3, 4,
        3, 1, 4,
      ]);
      MMGS.setTriangles(handle, triangles);

      // Save mesh
      MMGS.saveMesh(handle, "/surface.mesh");

      // Load into new handle
      const handle2 = MMGS.init();
      handles.push(handle2);
      MMGS.setIParam(handle2, IPARAM_S.verbose, -1);

      MMGS.loadMesh(handle2, "/surface.mesh");

      // Verify same structure
      const size = MMGS.getMeshSize(handle2);
      expect(size.nVertices).toBe(4);
      expect(size.nTriangles).toBe(4);
    });
  });

  describe("FS API", () => {
    beforeAll(async () => {
      await initMMG3D();
    });

    it("should expose FS.writeFile and FS.readFile", () => {
      const FS = getFS();

      // Write some data
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      FS.writeFile("/testdata.bin", testData);

      // Read it back
      const readData = FS.readFile("/testdata.bin", { encoding: "binary" });
      expect(readData).toEqual(testData);

      // Clean up
      FS.unlink("/testdata.bin");
    });

    it("should expose FS.unlink", () => {
      const FS = getFS();

      // Create a file
      FS.writeFile("/todelete.txt", "test");

      // Verify it exists
      expect(FS.analyzePath("/todelete.txt").exists).toBe(true);

      // Delete it
      FS.unlink("/todelete.txt");

      // Verify it's gone
      expect(FS.analyzePath("/todelete.txt").exists).toBe(false);
    });

    it("should expose FS.mkdir", () => {
      const FS = getFS();

      // Create directory
      FS.mkdir("/testdir");

      // Verify it exists
      expect(FS.analyzePath("/testdir").exists).toBe(true);

      // Clean up
      FS.rmdir("/testdir");
    });

    it("should read text files with utf8 encoding", () => {
      const FS = getFS();

      // Write text file
      FS.writeFile("/test.txt", "Hello, World!");

      // Read as text
      const text = FS.readFile("/test.txt", { encoding: "utf8" });
      expect(text).toBe("Hello, World!");

      // Clean up
      FS.unlink("/test.txt");
    });
  });
});
