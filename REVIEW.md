# mmg-wasm - Comprehensive Project Review

**Date:** 2026-01-29
**Branch reviewed:** `60-interactive-mesh-painting-for-local-refinement-control`
**Version:** 0.0.1 (pre-release)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Architecture Assessment](#3-architecture-assessment)
4. [Critical Issues](#4-critical-issues)
5. [Code Quality Issues](#5-code-quality-issues)
6. [Missing Features](#6-missing-features)
7. [Competitive Analysis](#7-competitive-analysis)
8. [Improvement Recommendations](#8-improvement-recommendations)
9. [Development Process Assessment](#9-development-process-assessment)

---

## 1. Executive Summary

mmg-wasm is a well-architected WebAssembly binding for the mmg C mesh remeshing library. The project demonstrates strong engineering fundamentals: clean TypeScript API design, comprehensive test suite, proper memory management patterns, and a polished interactive demo. However, several critical issues need attention before a v1.0 release, and there are significant opportunities to improve adoption through better packaging, documentation, and file format support.

**Overall assessment:** The core library is production-quality. The main gaps are in packaging/distribution (not published to npm, no exports map, no docs site) and ecosystem integration (limited file format support, no SIMD optimization).

### Strengths

- Unified Mesh class with auto-detection across 2D/3D/surface mesh types
- Anisotropic metric tensor support (unique among WASM mesh libraries)
- Local sizing constraints (sphere, circle, box, cylinder)
- Memory allocation tracking with configurable thresholds
- Web Worker support with progress callbacks
- Three.js integration utilities
- Comprehensive test suite (18 test files)
- Interactive React demo with mesh painting

### Key Concerns

- Stack overflow risk with large meshes (`Math.max(...cells)`)
- Module initialization race conditions
- Not published to npm; no releases created
- No CHANGELOG, no documentation site
- Only supports Medit `.mesh` format (no STL/OBJ/glTF)
- Missing `package.json` exports map for sub-path imports

---

## 2. Project Overview

### Tech Stack

| Component | Technology |
|-----------|------------|
| WASM compilation | Emscripten 4.0.10 |
| C library | mmg v5.8.0 |
| Language | TypeScript (strict mode) |
| Build | CMake + Ninja (WASM), Bun (TS) |
| Test runner | Bun test |
| Linter/Formatter | Biome |
| Web demo | React 18, Three.js 0.170, Tailwind CSS, Zustand, Vite |
| CI/CD | GitHub Actions (build, size tracking, Pages deployment) |

### Project Structure

```
mmg-wasm/
├── src/                    # TypeScript source (14 files)
│   ├── index.ts           # Public API barrel export
│   ├── mesh.ts            # Unified Mesh class (1,441 lines)
│   ├── memory.ts          # WASM heap management (599 lines)
│   ├── options.ts         # RemeshOptions & presets (447 lines)
│   ├── sizing.ts          # Local sizing constraints (340 lines)
│   ├── result.ts          # RemeshResult interface
│   ├── fs.ts              # Emscripten FS types
│   ├── mmg3d.ts/c         # MMG3D bindings
│   ├── mmg2d.ts/c         # MMG2D bindings
│   ├── mmgs.ts/c          # MMGS bindings
│   ├── three/index.ts     # Three.js integration
│   └── worker/            # Web Worker support
├── web/                    # Interactive React demo
├── test/                   # 18 test files + fixtures
├── build/                  # Emscripten WASM output
├── cmake/                  # CMake modules
├── scripts/                # Build scripts
└── .github/workflows/      # CI/CD (build, size, pages)
```

### Development History

28 commits across a structured 4-phase plan, all within January 21-22, 2026:

- **Phase 1 (Core):** Emscripten toolchain, MMG3D bindings, memory utilities, tests
- **Phase 2 (Extended):** MMG2D/MMGS bindings, file I/O, metric fields
- **Phase 3 (High-Level API):** Unified Mesh class, RemeshOptions, local refinement
- **Phase 4 (Production):** Web Workers, Three.js integration, demo, benchmarks

27 merged PRs, 1 open PR (#61 - mesh painting), 7 open issues remaining.

---

## 3. Architecture Assessment

### What Works Well

**Unified Mesh Class:** The `Mesh` class in `mesh.ts` is the API centerpiece. It auto-detects mesh type (2D/3D/surface) from vertex dimensions and cell sizes, provides factory methods (`Mesh.create()`, `Mesh.load()`, `Mesh.fromURL()`), and returns immutable `RemeshResult` objects from `remesh()`. This is a clean, functional API design.

**Memory Management:** The `memory.ts` module implements proper WASM heap lifecycle:
- `toWasmFloat64`/`toWasmInt32` copy JS arrays to WASM heap
- `fromWasmFloat64`/`fromWasmInt32` copy back (never returns views that could be invalidated by heap growth)
- `AllocationTracker` uses WeakMap per module to track allocations
- Configurable warning (80%) and error (95%) thresholds

**Type-Safe Bindings:** Each mmg sub-library has typed parameter enums (`IPARAM`, `DPARAM`), return codes, and mesh size interfaces. The `RemeshOptions` type maps cleanly to mmg parameters with validation.

**Worker Architecture:** The `MeshWorker` class properly serializes mesh data for transfer, supports operation IDs for tracking, and includes a cancel mechanism.

### Architectural Concerns

**Monolithic WASM Module:** All three mmg libraries (mmg2d, mmgs, mmg3d) are compiled into a single `mmg.wasm` binary. Users who only need 2D remeshing still download the entire module. Consider splitting into separate modules.

**C Wrapper Layer:** The C files (`mmg2d.c`, `mmgs.c`, `mmg3d.c`) wrap the mmg API for Emscripten export. These are manually maintained and must stay in sync with the TypeScript bindings. There's no automated binding generation.

**Module Initialization:** Global module state flags (`mmg2dInitialized`, etc.) are not synchronized, creating race conditions when multiple `Mesh.create()` calls happen concurrently.

---

## 4. Critical Issues

### 4.1 Stack Overflow on Large Meshes — ✅ Resolved

**File:** `src/mesh.ts:1138`
**Severity:** HIGH
**Status:** Fixed in `fix/critical-issues` branch

```typescript
Math.max(...cells)
```

This spreads the entire `cells` Int32Array as function arguments. For meshes with millions of elements, this will throw "Maximum call stack size exceeded." The V8 engine limits function arguments to ~65,536 on most platforms.

**Fix:** Replaced with a `for` loop that iterates safely over any array size.

### 4.2 Module Initialization Race Condition — ✅ Resolved

**File:** `src/mesh.ts:90-92`
**Severity:** HIGH
**Status:** Fixed in `fix/critical-issues` branch

Global module initialization flags are not atomic. Two concurrent `Mesh.create()` calls could both see `mmg2dInitialized === false` and both call `initMMG2D()`, causing duplicate initialization or corruption.

**Fix:** Replaced boolean flags with promise-based lazy singletons. The promise is assigned synchronously before any `await`, so concurrent callers share the same initialization promise.

### 4.3 Web Demo Module Singleton Race — ✅ Resolved

**File:** `web/src/hooks/useMmgWasm.ts:9-24`
**Severity:** MEDIUM
**Status:** Fixed in `fix/critical-issues` branch

The global `modulePromise` check at line 14 has no lock. Multiple React components mounting simultaneously could spawn multiple WASM module initializations.

**Fix:** Simplified to a single promise variable with the same lazy singleton pattern as 4.2. The redundant `moduleInstance` variable was removed.

### 4.4 Worker Cancellation Cannot Interrupt WASM — ✅ Resolved (documented)

**File:** `src/worker/remesh.worker.ts:104-105`
**Severity:** MEDIUM
**Status:** Documented in `fix/code-quality-issues` branch

The `cancel()` method sets a `cancelled` flag, but once MMG's C code is executing in WASM, there is no way to interrupt it. The flag is only checked between JavaScript operations, not during the remeshing computation itself. Users may expect cancellation to be immediate.

**Fix:** Added JSDoc to `handleRemesh` and `handleCancel` documenting cooperative cancellation semantics.

---

## 5. Code Quality Issues

### Memory Management

| Issue | Location | Severity |
|-------|----------|----------|
| `Math.max(...cells)` stack overflow | `mesh.ts:1138` | High |
| Unchecked intermediate malloc | `mmg3d.ts:465-471` | Medium |
| FS temp file cleanup on error | `mesh.ts:205-229` | Low | ✅ Fixed |

### Error Handling

| Issue | Location | Severity |
|-------|----------|----------|
| Empty mesh not validated in constructor | `mesh.ts:156-160` | Medium |
| `vertexDim - 2 < 0.01` tolerance in type detection | `mesh.ts:1146` | Medium | ✅ Fixed |
| Ambiguous cancel behavior when id is undefined | `worker/remesh.worker.ts:216-219` | Low | ✅ Documented |

### Concurrency

| Issue | Location | Severity |
|-------|----------|----------|
| Module init race condition | `mesh.ts:90-92` | High |
| Worker cancellation race | `worker/remesh.worker.ts:104-105` | Medium | ✅ Documented |
| Demo module singleton race | `web/src/hooks/useMmgWasm.ts:9-24` | Medium |

### Web Demo

| Issue | Location | Severity |
|-------|----------|----------|
| No error boundary for canvas failures | `MeshViewer3D.tsx` | Medium |
| Missing Three.js resource cleanup on unmount | `MeshViewer3D.tsx` | Medium |
| Unchecked null mesh reference in paint mode | `MeshViewer3D.tsx:69-100` | Medium |

### Performance

| Issue | Location | Severity |
|-------|----------|----------|
| `Math.max(...cells)` for large arrays | `mesh.ts:1138` | High |
| `number[]` intermediate in Three.js index conversion | `three/index.ts:254-258` | Low | ✅ Fixed |
| Repeated vertex iteration in `computeDefaultSize` | `mesh.ts:1074-1084` | Low |

### Build Configuration

| Issue | Location | Severity |
|-------|----------|----------|
| No WASM heap maximum limit | `CMakeLists.txt` | Medium |
| Missing security flags in debug builds (`-sSAFE_HEAP`) | `CMakeLists.txt` | Low |
| No `wasm-opt` post-processing step | build scripts | Low |

### Test Coverage Gaps

- No tests for concurrent remesh operations
- No tests for empty or degenerate meshes
- No tests for very large meshes (memory pressure)
- No memory leak detection against actual WASM heap state
- No integration tests for the web demo

---

## 6. Missing Features

### Pre-Release Blockers

| Feature | Priority | Description |
|---------|----------|-------------|
| npm publishing | Critical | Package not published; no `"exports"` map in package.json |
| Documentation site | High | No API docs beyond JSDoc; no usage guides |
| CHANGELOG | High | No version history |
| Additional file formats | High | Only Medit `.mesh`; need STL/OBJ at minimum |
| Error recovery | Medium | No graceful handling of WASM OOM or module crash |

### Package Distribution

The `package.json` is missing several fields important for npm publishing:

```json
// Current
"main": "dist/mmg.js",
"types": "dist/mmg.d.ts",
"files": ["dist"]

// Recommended additions
"exports": {
  ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
  "./three": { "import": "./dist/three/index.js", "types": "./dist/three/index.d.ts" },
  "./worker": { "import": "./dist/worker/index.js", "types": "./dist/worker/index.d.ts" }
},
"sideEffects": false
```

The `.wasm` file distribution strategy is unclear. Users need to know how to serve `mmg.wasm` alongside the JS bundle. Consider:
- Inlining WASM as base64 (for small modules)
- Providing a WASM URL configuration option
- Supporting `WebAssembly.compileStreaming()` for optimal loading

### Open Issues from Roadmap

| # | Feature | Phase |
|---|---------|-------|
| 25 | Comprehensive documentation | Phase 4 |
| 26 | Level-set discretization | Phase 5 |
| 27 | Lagrangian motion remeshing | Phase 5 |
| 28 | Mesh validation utilities | Phase 5 |
| 29 | Additional mesh formats (STL, OBJ, PLY) | Phase 5 |
| 30 | VTK-WASM integration | Phase 5 |
| 60 | Interactive mesh painting | Phase 4 (in progress) |

---

## 7. Competitive Analysis

### Feature Comparison Matrix

| Feature | mmg-wasm | manifold-3d | meshoptimizer | OpenCascade.js | MeshLib |
|---------|----------|-------------|---------------|----------------|---------|
| Remeshing | **Yes** | Subdivision | No | Tessellation | Yes |
| Anisotropic metrics | **Yes** | No | No | No | No |
| Local sizing | **Yes** | No | No | No | Partial |
| 2D + 3D + Surface | **Yes** | 3D only | 3D only | 3D (BREP) | Surface + Volume |
| Mesh booleans (CSG) | No | **Yes** | No | **Yes** | **Yes** |
| Simplification | No | No | **Yes** | No | **Yes** |
| SIMD support | No | No | **Yes (3x)** | No | No |
| File formats | .mesh only | glTF | glTF | STEP/IGES/STL | STL/PLY/OBJ |
| Three.js integration | Yes | Yes | Built-in | No | No |
| Web Workers | Yes | No | Yes | Multi-thread | No |
| npm published | **No** | Yes | Yes | Yes | No |
| npm weekly downloads | 0 | ~low | ~246K | ~moderate | 0 |
| TypeScript types | Yes | Yes | Yes | Yes (auto-gen) | N/A |
| Bundle size | ~3MB | ~2.2MB | Very small | Large (custom builds) | N/A |
| Documentation site | No | Yes | Yes | Yes | Yes |

### mmg-wasm's Unique Strengths

1. **Anisotropic metric tensor fields** -- No other WASM mesh library offers per-vertex anisotropic metric control
2. **Local sizing constraints** -- Unique spatial refinement control (sphere, circle, box, cylinder)
3. **Unified 2D + 3D + Surface API** -- Single Mesh class handles all three mesh types
4. **Immutable remeshing pattern** -- `mesh.remesh()` returns a new mesh, leaving original unchanged
5. **Quality metrics tracking** -- Returns before/after quality measurements
6. **Memory allocation tracking** -- Comprehensive allocation tracking with configurable thresholds

### Competitive Gaps

1. **File format support** -- All major competitors support STL/OBJ/glTF; mmg-wasm only supports Medit .mesh
2. **SIMD optimization** -- meshoptimizer achieves 3x speedup with WASM SIMD
3. **Tree-shakeable builds** -- OpenCascade.js allows custom builds; mmg-wasm ships a monolithic module
4. **Documentation site** -- All published competitors have dedicated doc sites

---

## 8. Improvement Recommendations

### Priority 1: Pre-Release (Before v1.0)

1. **Fix `Math.max(...cells)` stack overflow** -- Replace with safe iteration for large meshes
2. **Fix module initialization race conditions** -- Use lazy singleton Promise pattern
3. **Add `package.json` exports map** -- Enable `mmg-wasm/three` and `mmg-wasm/worker` sub-path imports
4. **Publish to npm** -- Set up npm publishing workflow in CI
5. **Create GitHub releases** -- With CHANGELOG and semantic versioning
6. **Document WASM loading** -- Explain how to serve `.wasm` file with various bundlers (Vite, webpack, Rollup)
7. **Set WASM heap maximum** -- Add `-sMAXIMUM_MEMORY=512MB` or similar to prevent unbounded growth

### Priority 2: Ecosystem Integration

8. **Add STL import/export** -- Most common mesh exchange format
9. **Add OBJ import/export** -- Widely used in 3D graphics
10. **Allow custom WASM URL** -- Let users specify where `.wasm` is hosted (CDN, custom path)
11. **Improve Three.js index conversion** -- Use `Uint32Array` directly instead of `number[]` intermediate
12. **Document worker cancellation limitation** -- Cannot interrupt running WASM computation
13. **Add documentation site** -- Use VitePress, Starlight, or similar

### Priority 3: Performance & Advanced Features

14. **Enable WASM SIMD** -- Add `-msimd128` Emscripten flag for vectorized operations
15. **Run `wasm-opt`** -- Post-process `.wasm` binary for 10-20% size reduction
16. **Split WASM modules** -- Separate mmg2d.wasm, mmgs.wasm, mmg3d.wasm to reduce download size
17. **Add worker pool** -- Pool multiple workers for batch operations
18. **Cache compiled WASM module** -- Use `WebAssembly.compileStreaming()` and IndexedDB caching
19. **Add mesh validation utilities** -- Pre-flight checks before remeshing
20. **Explore level-set discretization** -- mmg supports this natively; expose through TypeScript API

### Priority 4: Quality of Life

21. **Add Three.js vertex attribute transfer** -- Colors, UVs, not just positions/indices
22. **Add error boundaries in web demo** -- Catch canvas/WebGL failures gracefully
23. **Add Three.js resource cleanup** -- Dispose geometries/materials on component unmount
24. **Improve memory tracking accuracy** -- Account for MMG internal allocations
25. **Add CLI tool** -- `npx mmg-wasm remesh input.mesh --hmax 0.1` for pipeline usage

---

## 9. Development Process Assessment

### Strengths

- **Structured phased development** -- Clear progression from core bindings to production features
- **Issue-to-PR tracking** -- Every PR maps to a GitHub issue with consistent labeling
- **Consistent commit conventions** -- `feat:`, `test:`, `fix:` prefixes
- **CI/CD pipeline** -- Multi-config builds, bundle size tracking, GitHub Pages deployment
- **Comprehensive testing** -- 18 test files covering all major modules + benchmarks
- **Code quality tooling** -- Biome for linting/formatting, TypeScript strict mode

### Areas for Improvement

- **No CHANGELOG** -- Should be added before first release
- **No contribution guidelines** -- No CONTRIBUTING.md
- **No release process** -- No semantic-release or manual release workflow
- **Bundle size budget exists but is generous** -- 3MB gzipped is the target; competitors are smaller
- **Test gaps** -- No integration tests for the web demo, no edge case tests for empty/degenerate meshes, no concurrent operation tests

---

*Report generated from analysis of all source files, test files, build configuration, git history (28 commits, 27 PRs), 7 open issues, and comparison with 7 competing WASM mesh processing libraries.*
