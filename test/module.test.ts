import { describe, expect, it, beforeAll, afterEach } from "bun:test";
import {
	initMMG3D,
	getWasmModule,
	MMG3D,
	IPARAM,
	DPARAM,
	MMG_RETURN_CODES,
	type MeshHandle,
	type MMG3DModule,
} from "../src/index";

describe("WASM Module Loading", () => {
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

	it("module loads successfully", () => {
		// initMMG3D was called in beforeAll, verify MMG3D is defined and usable
		expect(MMG3D).toBeDefined();
		expect(typeof MMG3D.init).toBe("function");
	});

	it("module exports expected functions", () => {
		// Verify all public API functions are exported
		expect(typeof MMG3D.init).toBe("function");
		expect(typeof MMG3D.free).toBe("function");
		expect(typeof MMG3D.setMeshSize).toBe("function");
		expect(typeof MMG3D.getMeshSize).toBe("function");
		expect(typeof MMG3D.setVertex).toBe("function");
		expect(typeof MMG3D.setVertices).toBe("function");
		expect(typeof MMG3D.getVertices).toBe("function");
		expect(typeof MMG3D.setTetrahedron).toBe("function");
		expect(typeof MMG3D.setTetrahedra).toBe("function");
		expect(typeof MMG3D.getTetrahedra).toBe("function");
		expect(typeof MMG3D.setTriangle).toBe("function");
		expect(typeof MMG3D.setTriangles).toBe("function");
		expect(typeof MMG3D.getTriangles).toBe("function");
		expect(typeof MMG3D.setIParam).toBe("function");
		expect(typeof MMG3D.setDParam).toBe("function");
		expect(typeof MMG3D.mmg3dlib).toBe("function");
		expect(typeof MMG3D.getAvailableHandles).toBe("function");
		expect(typeof MMG3D.getMaxHandles).toBe("function");
	});

	it("module exports parameter enums", () => {
		// Verify IPARAM exports with key values
		expect(IPARAM).toBeDefined();
		expect(typeof IPARAM.verbose).toBe("number");
		expect(IPARAM.verbose).toBe(0);
		expect(typeof IPARAM.mem).toBe("number");
		expect(typeof IPARAM.debug).toBe("number");
		expect(typeof IPARAM.angle).toBe("number");
		expect(typeof IPARAM.iso).toBe("number");
		expect(typeof IPARAM.noinsert).toBe("number");
		expect(typeof IPARAM.noswap).toBe("number");
		expect(typeof IPARAM.nomove).toBe("number");

		// Verify DPARAM exports with key values
		expect(DPARAM).toBeDefined();
		expect(typeof DPARAM.hmax).toBe("number");
		expect(DPARAM.hmax).toBe(28);
		expect(typeof DPARAM.hmin).toBe("number");
		expect(typeof DPARAM.hsiz).toBe("number");
		expect(typeof DPARAM.hausd).toBe("number");
		expect(typeof DPARAM.hgrad).toBe("number");

		// Verify MMG_RETURN_CODES
		expect(MMG_RETURN_CODES).toBeDefined();
		expect(MMG_RETURN_CODES.SUCCESS).toBe(0);
		expect(MMG_RETURN_CODES.LOWFAILURE).toBe(1);
		expect(MMG_RETURN_CODES.STRONGFAILURE).toBe(2);
	});

	it("can initialize and free mesh without errors", () => {
		const handle = MMG3D.init();
		expect(handle).toBeGreaterThanOrEqual(0);

		// Should not throw
		expect(() => MMG3D.free(handle)).not.toThrow();
	});

	it("multiple instances work independently", () => {
		const handle1 = MMG3D.init();
		const handle2 = MMG3D.init();
		handles.push(handle1, handle2);

		// Handles should be different
		expect(handle1).not.toBe(handle2);

		// Set different sizes for each mesh
		MMG3D.setMeshSize(handle1, 4, 1, 0, 4, 0, 0);
		MMG3D.setMeshSize(handle2, 8, 2, 0, 8, 0, 0);

		// Verify each mesh has its own independent state
		const size1 = MMG3D.getMeshSize(handle1);
		const size2 = MMG3D.getMeshSize(handle2);

		expect(size1.nVertices).toBe(4);
		expect(size1.nTetrahedra).toBe(1);
		expect(size1.nTriangles).toBe(4);

		expect(size2.nVertices).toBe(8);
		expect(size2.nTetrahedra).toBe(2);
		expect(size2.nTriangles).toBe(8);
	});
});

describe("Environment Compatibility", () => {
	let module: MMG3DModule;

	beforeAll(async () => {
		await initMMG3D();
		module = getWasmModule();
	});

	it("WASM binary is correctly loaded", () => {
		// Verify the module has the expected WASM heap views
		expect(module).toBeDefined();
		expect(module.HEAPU8).toBeDefined();
		expect(module.HEAPU8).toBeInstanceOf(Uint8Array);
		expect(module.HEAPU8.byteLength).toBeGreaterThan(0);

		expect(module.HEAPF64).toBeDefined();
		expect(module.HEAPF64).toBeInstanceOf(Float64Array);

		expect(module.HEAP32).toBeDefined();
		expect(module.HEAP32).toBeInstanceOf(Int32Array);

		// Verify memory allocation functions exist
		expect(typeof module._malloc).toBe("function");
		expect(typeof module._free).toBe("function");

		// Verify getValue/setValue are available
		expect(typeof module.getValue).toBe("function");
		expect(typeof module.setValue).toBe("function");
	});

	it("async initialization completes in reasonable time", async () => {
		// This test measures that a fresh module load completes reasonably fast
		// We use a generous timeout since WASM compilation time varies by environment
		const startTime = performance.now();

		// Re-import the module factory to simulate fresh load
		// @ts-ignore - Emscripten module doesn't have TypeScript declarations
		const createModule = (await import("../build/dist/mmg.js")).default;
		await createModule();

		const elapsed = performance.now() - startTime;

		// Should complete within 5 seconds even on slow systems
		expect(elapsed).toBeLessThan(5000);
	});
});
