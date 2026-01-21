import { describe, expect, it, beforeAll, afterEach } from "bun:test";
import {
	initMMG3D,
	MMG3D,
	IPARAM,
	DPARAM,
	MMG_RETURN_CODES,
	type MeshHandle,
} from "../src/mmg3d";

describe("MMG3D", () => {
	// Track handles for cleanup
	const handles: MeshHandle[] = [];

	beforeAll(async () => {
		await initMMG3D();
	});

	afterEach(() => {
		// Clean up any handles created during tests
		for (const handle of handles) {
			try {
				MMG3D.free(handle);
			} catch {
				// Ignore errors from already-freed handles
			}
		}
		handles.length = 0;
	});

	describe("Initialization", () => {
		it("should initialize a mesh and return a valid handle", () => {
			const handle = MMG3D.init();
			handles.push(handle);
			expect(handle).toBeGreaterThanOrEqual(0);
		});

		it("should free a mesh successfully", () => {
			const handle = MMG3D.init();
			// Don't add to handles array since we're freeing it manually
			expect(() => MMG3D.free(handle)).not.toThrow();
		});

		it("should throw when freeing an invalid handle", () => {
			expect(() => MMG3D.free(-1 as MeshHandle)).toThrow();
		});

		it("should throw when double-freeing a handle", () => {
			const handle = MMG3D.init();
			MMG3D.free(handle);
			expect(() => MMG3D.free(handle)).toThrow();
		});
	});

	describe("Mesh Size", () => {
		it("should set and get mesh size", () => {
			const handle = MMG3D.init();
			handles.push(handle);

			MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

			const size = MMG3D.getMeshSize(handle);
			expect(size.nVertices).toBe(4);
			expect(size.nTetrahedra).toBe(1);
			expect(size.nPrisms).toBe(0);
			expect(size.nTriangles).toBe(4);
			expect(size.nQuads).toBe(0);
			expect(size.nEdges).toBe(0);
		});
	});

	describe("Vertices", () => {
		it("should set and get a single vertex", () => {
			const handle = MMG3D.init();
			handles.push(handle);

			MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);
			MMG3D.setVertex(handle, 1, 0.0, 0.0, 0.0);
			MMG3D.setVertex(handle, 2, 1.0, 0.0, 0.0);
			MMG3D.setVertex(handle, 3, 0.5, 1.0, 0.0);
			MMG3D.setVertex(handle, 4, 0.5, 0.5, 1.0);

			const vertices = MMG3D.getVertices(handle);
			expect(vertices.length).toBe(12); // 4 vertices * 3 coordinates

			// Check first vertex
			expect(vertices[0]).toBeCloseTo(0.0);
			expect(vertices[1]).toBeCloseTo(0.0);
			expect(vertices[2]).toBeCloseTo(0.0);

			// Check second vertex
			expect(vertices[3]).toBeCloseTo(1.0);
			expect(vertices[4]).toBeCloseTo(0.0);
			expect(vertices[5]).toBeCloseTo(0.0);
		});

		it("should set vertices in bulk", () => {
			const handle = MMG3D.init();
			handles.push(handle);

			MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

			const vertices = new Float64Array([
				0.0, 0.0, 0.0, // vertex 1
				1.0, 0.0, 0.0, // vertex 2
				0.5, 1.0, 0.0, // vertex 3
				0.5, 0.5, 1.0, // vertex 4
			]);

			MMG3D.setVertices(handle, vertices);

			const result = MMG3D.getVertices(handle);
			expect(result.length).toBe(12);

			// Verify all vertices
			for (let i = 0; i < vertices.length; i++) {
				expect(result[i]).toBeCloseTo(vertices[i]);
			}
		});

		it("should set vertices with references", () => {
			const handle = MMG3D.init();
			handles.push(handle);

			MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

			const vertices = new Float64Array([
				0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
			]);
			const refs = new Int32Array([1, 2, 3, 4]);

			// Should not throw
			expect(() => MMG3D.setVertices(handle, vertices, refs)).not.toThrow();
		});
	});

	describe("Tetrahedra", () => {
		it("should set and get a single tetrahedron", () => {
			const handle = MMG3D.init();
			handles.push(handle);

			MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

			// Set vertices
			MMG3D.setVertex(handle, 1, 0.0, 0.0, 0.0);
			MMG3D.setVertex(handle, 2, 1.0, 0.0, 0.0);
			MMG3D.setVertex(handle, 3, 0.5, 1.0, 0.0);
			MMG3D.setVertex(handle, 4, 0.5, 0.5, 1.0);

			// Set tetrahedron (1-indexed vertices)
			MMG3D.setTetrahedron(handle, 1, 1, 2, 3, 4);

			const tetra = MMG3D.getTetrahedra(handle);
			expect(tetra.length).toBe(4); // 1 tetrahedron * 4 vertices
			expect(tetra[0]).toBe(1);
			expect(tetra[1]).toBe(2);
			expect(tetra[2]).toBe(3);
			expect(tetra[3]).toBe(4);
		});

		it("should set tetrahedra in bulk", () => {
			const handle = MMG3D.init();
			handles.push(handle);

			MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

			// Set vertices
			const vertices = new Float64Array([
				0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
			]);
			MMG3D.setVertices(handle, vertices);

			// Set tetrahedra (1-indexed)
			const tetra = new Int32Array([1, 2, 3, 4]);
			MMG3D.setTetrahedra(handle, tetra);

			const result = MMG3D.getTetrahedra(handle);
			expect(result.length).toBe(4);
			for (let i = 0; i < tetra.length; i++) {
				expect(result[i]).toBe(tetra[i]);
			}
		});
	});

	describe("Triangles", () => {
		it("should set and get a single triangle", () => {
			const handle = MMG3D.init();
			handles.push(handle);

			MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

			// Set vertices
			MMG3D.setVertex(handle, 1, 0.0, 0.0, 0.0);
			MMG3D.setVertex(handle, 2, 1.0, 0.0, 0.0);
			MMG3D.setVertex(handle, 3, 0.5, 1.0, 0.0);
			MMG3D.setVertex(handle, 4, 0.5, 0.5, 1.0);

			// Set triangle (1-indexed vertices)
			MMG3D.setTriangle(handle, 1, 1, 2, 3);
			MMG3D.setTriangle(handle, 2, 1, 2, 4);
			MMG3D.setTriangle(handle, 3, 2, 3, 4);
			MMG3D.setTriangle(handle, 4, 1, 3, 4);

			const tria = MMG3D.getTriangles(handle);
			expect(tria.length).toBe(12); // 4 triangles * 3 vertices

			// Check first triangle
			expect(tria[0]).toBe(1);
			expect(tria[1]).toBe(2);
			expect(tria[2]).toBe(3);
		});

		it("should set triangles in bulk", () => {
			const handle = MMG3D.init();
			handles.push(handle);

			MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

			// Set vertices
			const vertices = new Float64Array([
				0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0, 0.5, 0.5, 1.0,
			]);
			MMG3D.setVertices(handle, vertices);

			// Set triangles (1-indexed)
			const tria = new Int32Array([
				1, 2, 3, // face 1
				1, 2, 4, // face 2
				2, 3, 4, // face 3
				1, 3, 4, // face 4
			]);
			MMG3D.setTriangles(handle, tria);

			const result = MMG3D.getTriangles(handle);
			expect(result.length).toBe(12);
			for (let i = 0; i < tria.length; i++) {
				expect(result[i]).toBe(tria[i]);
			}
		});
	});

	describe("Parameters", () => {
		it("should set integer parameters", () => {
			const handle = MMG3D.init();
			handles.push(handle);

			// Set verbosity to silent
			expect(() => MMG3D.setIParam(handle, IPARAM.verbose, -1)).not.toThrow();
		});

		it("should set double parameters", () => {
			const handle = MMG3D.init();
			handles.push(handle);

			// Set max edge length
			expect(() => MMG3D.setDParam(handle, DPARAM.hmax, 0.5)).not.toThrow();
		});
	});

	describe("Remeshing", () => {
		it("should remesh a simple tetrahedron", () => {
			const handle = MMG3D.init();
			handles.push(handle);

			// Create a simple tetrahedron mesh
			MMG3D.setMeshSize(handle, 4, 1, 0, 4, 0, 0);

			// Set vertices (a unit tetrahedron)
			const vertices = new Float64Array([
				0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 0.866, 0.0, 0.5, 0.289, 0.816,
			]);
			MMG3D.setVertices(handle, vertices);

			// Set tetrahedron
			const tetra = new Int32Array([1, 2, 3, 4]);
			MMG3D.setTetrahedra(handle, tetra);

			// Set boundary triangles
			const tria = new Int32Array([
				1, 3, 2, // bottom face (outward normal)
				1, 2, 4, // front face
				2, 3, 4, // right face
				3, 1, 4, // left face
			]);
			MMG3D.setTriangles(handle, tria);

			// Set parameters for refinement
			MMG3D.setIParam(handle, IPARAM.verbose, -1); // Silent
			MMG3D.setDParam(handle, DPARAM.hmax, 0.3); // Small edge length to trigger refinement

			// Run remeshing
			const result = MMG3D.mmg3dlib(handle);

			// Check result (0 = success)
			expect(result).toBe(MMG_RETURN_CODES.SUCCESS);

			// Verify mesh was refined (should have more vertices/tetrahedra)
			const newSize = MMG3D.getMeshSize(handle);
			expect(newSize.nVertices).toBeGreaterThan(4);
			expect(newSize.nTetrahedra).toBeGreaterThan(1);

			// Verify we can retrieve the new mesh data
			const newVertices = MMG3D.getVertices(handle);
			expect(newVertices.length).toBe(newSize.nVertices * 3);

			const newTetra = MMG3D.getTetrahedra(handle);
			expect(newTetra.length).toBe(newSize.nTetrahedra * 4);
		});
	});

	describe("Multiple Handles", () => {
		it("should work with multiple independent meshes", () => {
			const handle1 = MMG3D.init();
			const handle2 = MMG3D.init();
			handles.push(handle1, handle2);

			expect(handle1).not.toBe(handle2);

			// Set different sizes for each mesh
			MMG3D.setMeshSize(handle1, 4, 1, 0, 4, 0, 0);
			MMG3D.setMeshSize(handle2, 8, 2, 0, 8, 0, 0);

			const size1 = MMG3D.getMeshSize(handle1);
			const size2 = MMG3D.getMeshSize(handle2);

			expect(size1.nVertices).toBe(4);
			expect(size2.nVertices).toBe(8);
		});
	});
});
