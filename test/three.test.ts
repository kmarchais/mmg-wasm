import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import * as THREE from "three";
import { Mesh, MeshType, initMMG2D, initMMG3D, initMMGS } from "../src";
import {
	fromThreeGeometry,
	toThreeGeometry,
	toThreeGeometrySync,
} from "../src/three";
import { cubeTetrahedra, cubeTriangles, cubeVertices } from "./fixtures/cube";
import { squareEdges, squareTriangles, squareVertices } from "./fixtures/square";

describe("Three.js Integration", () => {
	const meshes: Mesh[] = [];
	const geometries: THREE.BufferGeometry[] = [];

	beforeAll(async () => {
		await initMMG2D();
		await initMMG3D();
		await initMMGS();
	});

	afterEach(() => {
		for (const mesh of meshes) {
			try {
				mesh.free();
			} catch {
				// Ignore errors from already-freed meshes
			}
		}
		meshes.length = 0;

		for (const geometry of geometries) {
			geometry.dispose();
		}
		geometries.length = 0;
	});

	describe("fromThreeGeometry", () => {
		it("should convert indexed BoxGeometry to surface mesh", () => {
			const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			geometries.push(boxGeometry);

			const mesh = fromThreeGeometry(boxGeometry);
			meshes.push(mesh);

			expect(mesh.type).toBe(MeshType.MeshS);
			expect(mesh.dimension).toBe(3);
			expect(mesh.nVertices).toBe(boxGeometry.attributes.position.count);
			// BoxGeometry has 6 faces * 2 triangles = 12 triangles
			expect(mesh.nCells).toBe(12);
		});

		it("should convert SphereGeometry to surface mesh", () => {
			const sphereGeometry = new THREE.SphereGeometry(1, 8, 6);
			geometries.push(sphereGeometry);

			const mesh = fromThreeGeometry(sphereGeometry);
			meshes.push(mesh);

			expect(mesh.type).toBe(MeshType.MeshS);
			expect(mesh.nVertices).toBeGreaterThan(0);
			expect(mesh.nCells).toBeGreaterThan(0);
		});

		it("should convert PlaneGeometry to surface mesh by default", () => {
			const planeGeometry = new THREE.PlaneGeometry(1, 1);
			geometries.push(planeGeometry);

			const mesh = fromThreeGeometry(planeGeometry);
			meshes.push(mesh);

			// PlaneGeometry has 3D vertices, so it's a surface mesh
			expect(mesh.type).toBe(MeshType.MeshS);
			expect(mesh.nVertices).toBe(4);
			expect(mesh.nCells).toBe(2);
		});

		it("should force mesh type with options", () => {
			const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			geometries.push(boxGeometry);

			const mesh = fromThreeGeometry(boxGeometry, { type: MeshType.MeshS });
			meshes.push(mesh);

			expect(mesh.type).toBe(MeshType.MeshS);
		});

		it("should handle non-indexed geometry", () => {
			// Create a non-indexed geometry
			const geometry = new THREE.BufferGeometry();
			const vertices = new Float32Array([
				0, 0, 0, 1, 0, 0, 0.5, 1, 0, 1, 0, 0, 2, 0, 0, 1.5, 1, 0,
			]);
			geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
			geometries.push(geometry);

			const mesh = fromThreeGeometry(geometry);
			meshes.push(mesh);

			expect(mesh.type).toBe(MeshType.MeshS);
			expect(mesh.nVertices).toBe(6);
			expect(mesh.nCells).toBe(2);
		});

		it("should throw for geometry without position attribute", () => {
			const geometry = new THREE.BufferGeometry();
			geometries.push(geometry);

			expect(() => fromThreeGeometry(geometry)).toThrow(
				/must have a position attribute/,
			);
		});

		it("should throw for geometry with less than 3 vertices", () => {
			const geometry = new THREE.BufferGeometry();
			const vertices = new Float32Array([0, 0, 0, 1, 0, 0]);
			geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
			geometries.push(geometry);

			expect(() => fromThreeGeometry(geometry)).toThrow(/at least 3 vertices/);
		});

		it("should convert 1-indexed cells correctly", () => {
			const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			geometries.push(boxGeometry);

			const mesh = fromThreeGeometry(boxGeometry);
			meshes.push(mesh);

			// Check that cells are 1-indexed (MMG convention)
			const cells = mesh.cells;
			const minIndex = Math.min(...cells);
			expect(minIndex).toBeGreaterThanOrEqual(1);
		});
	});

	describe("toThreeGeometry", () => {
		it("should convert surface mesh to BufferGeometry", async () => {
			const mesh = new Mesh({
				vertices: cubeVertices,
				cells: cubeTriangles,
				type: MeshType.MeshS,
			});
			meshes.push(mesh);

			const geometry = await toThreeGeometry(mesh);
			geometries.push(geometry);

			expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
			expect(geometry.attributes.position).toBeDefined();
			expect(geometry.index).toBeDefined();

			// Check vertex count matches
			expect(geometry.attributes.position.count).toBe(mesh.nVertices);

			// Check that normals were computed
			expect(geometry.attributes.normal).toBeDefined();
		});

		it("should convert 3D volumetric mesh using boundary faces", async () => {
			const mesh = new Mesh({
				vertices: cubeVertices,
				cells: cubeTetrahedra,
				boundaryFaces: cubeTriangles,
			});
			meshes.push(mesh);

			const geometry = await toThreeGeometry(mesh);
			geometries.push(geometry);

			expect(geometry.attributes.position.count).toBe(mesh.nVertices);
			// Index count should match boundary triangles count * 3
			expect(geometry.index?.count).toBe(mesh.nBoundaryFaces * 3);
		});

		it("should convert 2D mesh with z=0", async () => {
			const mesh = new Mesh({
				vertices: squareVertices,
				cells: squareTriangles,
				boundaryFaces: squareEdges,
			});
			meshes.push(mesh);

			const geometry = await toThreeGeometry(mesh);
			geometries.push(geometry);

			// 2D mesh should have 3D positions with z=0
			const positions = geometry.attributes.position;
			expect(positions.count).toBe(mesh.nVertices);
			expect(positions.itemSize).toBe(3);

			// Check that all z values are 0
			for (let i = 0; i < positions.count; i++) {
				expect(positions.getZ(i)).toBe(0);
			}
		});

		it("should skip normal computation when disabled", async () => {
			const mesh = new Mesh({
				vertices: cubeVertices,
				cells: cubeTriangles,
				type: MeshType.MeshS,
			});
			meshes.push(mesh);

			const geometry = await toThreeGeometry(mesh, { computeNormals: false });
			geometries.push(geometry);

			expect(geometry.attributes.normal).toBeUndefined();
		});

		it("should convert indices to 0-indexed", async () => {
			const mesh = new Mesh({
				vertices: cubeVertices,
				cells: cubeTriangles,
				type: MeshType.MeshS,
			});
			meshes.push(mesh);

			const geometry = await toThreeGeometry(mesh);
			geometries.push(geometry);

			// Check that indices are 0-indexed (Three.js convention)
			const index = geometry.index;
			if (index) {
				const minIndex = Math.min(...index.array);
				expect(minIndex).toBe(0);
			}
		});
	});

	describe("toThreeGeometrySync", () => {
		it("should convert mesh synchronously", () => {
			const mesh = new Mesh({
				vertices: cubeVertices,
				cells: cubeTriangles,
				type: MeshType.MeshS,
			});
			meshes.push(mesh);

			const geometry = toThreeGeometrySync(mesh, THREE);
			geometries.push(geometry);

			expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
			expect(geometry.attributes.position.count).toBe(mesh.nVertices);
		});

		it("should match async version output", async () => {
			const mesh = new Mesh({
				vertices: cubeVertices,
				cells: cubeTriangles,
				type: MeshType.MeshS,
			});
			meshes.push(mesh);

			const asyncGeometry = await toThreeGeometry(mesh);
			const syncGeometry = toThreeGeometrySync(mesh, THREE);
			geometries.push(asyncGeometry, syncGeometry);

			// Compare positions
			const asyncPositions = asyncGeometry.attributes.position;
			const syncPositions = syncGeometry.attributes.position;

			expect(syncPositions.count).toBe(asyncPositions.count);
			for (let i = 0; i < asyncPositions.count; i++) {
				expect(syncPositions.getX(i)).toBe(asyncPositions.getX(i));
				expect(syncPositions.getY(i)).toBe(asyncPositions.getY(i));
				expect(syncPositions.getZ(i)).toBe(asyncPositions.getZ(i));
			}
		});
	});

	describe("Round-trip conversion", () => {
		it("should preserve vertex count in Three.js -> mmg -> Three.js", async () => {
			const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			geometries.push(boxGeometry);

			const originalVertexCount = boxGeometry.attributes.position.count;

			// Convert to mmg-wasm
			const mesh = fromThreeGeometry(boxGeometry);
			meshes.push(mesh);

			// Convert back to Three.js
			const resultGeometry = await toThreeGeometry(mesh);
			geometries.push(resultGeometry);

			expect(resultGeometry.attributes.position.count).toBe(originalVertexCount);
		});

		it("should preserve triangle count in round-trip", async () => {
			const sphereGeometry = new THREE.SphereGeometry(1, 16, 12);
			geometries.push(sphereGeometry);

			const originalTriangles = sphereGeometry.index
				? sphereGeometry.index.count / 3
				: sphereGeometry.attributes.position.count / 3;

			const mesh = fromThreeGeometry(sphereGeometry);
			meshes.push(mesh);

			const resultGeometry = await toThreeGeometry(mesh);
			geometries.push(resultGeometry);

			const resultTriangles = resultGeometry.index
				? resultGeometry.index.count / 3
				: resultGeometry.attributes.position.count / 3;

			expect(resultTriangles).toBe(originalTriangles);
		});

		it("should allow remeshing and conversion back", async () => {
			const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			geometries.push(boxGeometry);

			// Convert to mmg-wasm
			const mesh = fromThreeGeometry(boxGeometry);
			meshes.push(mesh);

			// Remesh with finer resolution
			const result = await mesh.remesh({ hmax: 0.2 });
			meshes.push(result.mesh);

			expect(result.success).toBe(true);
			expect(result.nVertices).toBeGreaterThan(mesh.nVertices);

			// Convert back to Three.js
			const resultGeometry = await toThreeGeometry(result.mesh);
			geometries.push(resultGeometry);

			expect(resultGeometry.attributes.position.count).toBe(result.nVertices);
		});
	});

	describe("Integration with local refinement", () => {
		it("should support local refinement workflow", async () => {
			const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			geometries.push(boxGeometry);

			// Convert to mmg-wasm
			const mesh = fromThreeGeometry(boxGeometry);
			meshes.push(mesh);

			// Add local refinement
			mesh.setSizeSphere([0, 0, 0], 0.3, 0.05);

			// Remesh
			const result = await mesh.remesh();
			meshes.push(result.mesh);

			expect(result.success).toBe(true);

			// Convert back
			const resultGeometry = await toThreeGeometry(result.mesh);
			geometries.push(resultGeometry);

			expect(resultGeometry.attributes.position).toBeDefined();
		});
	});

	describe("Float64 to Float32 precision", () => {
		it("should handle typical geometry coordinates", () => {
			// Test with coordinates that are typical for 3D models
			const geometry = new THREE.BufferGeometry();
			const vertices = new Float32Array([
				-100.5, 200.25, 50.125, 100.5, -200.25, -50.125, 0.001, 0.001, 0.001,
			]);
			geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
			geometries.push(geometry);

			const mesh = fromThreeGeometry(geometry);
			meshes.push(mesh);

			// Verify coordinates are preserved within float32 precision
			const meshVertices = mesh.vertices;
			expect(Math.abs(meshVertices[0] - -100.5)).toBeLessThan(0.001);
			expect(Math.abs(meshVertices[1] - 200.25)).toBeLessThan(0.001);
			expect(Math.abs(meshVertices[6] - 0.001)).toBeLessThan(0.0001);
		});
	});
});
