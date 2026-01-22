/**
 * MMG2D WebAssembly wrapper functions
 *
 * This file provides C wrapper functions that expose the MMG2D API to JavaScript
 * via Emscripten. It uses a handle-based memory management pattern where mesh/solution
 * pointer pairs are stored in a handle table and referenced by integer handles.
 *
 * The variadic MMG2D C API (using MMG5_ARG_*) cannot be called directly from JavaScript,
 * so these wrappers provide simple function signatures callable via cwrap.
 */

#include <emscripten.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include "mmg/mmg2d/libmmg2d.h"

/*
 * Verify MMG5_int is 32-bit. This assumption is used when casting between
 * MMG5_int* and int* for the JavaScript bindings. If this fails, the get_*
 * functions need to be updated to handle the size difference.
 */
_Static_assert(sizeof(MMG5_int) == sizeof(int32_t),
    "MMG5_int must be 32-bit for JavaScript bindings");

/*
 * Maximum number of concurrent mesh handles.
 * This limit exists because handles are stored in a fixed-size array.
 * For typical browser usage, 64 concurrent meshes should be sufficient.
 * Use mmg2d_get_available_handles() to check current capacity.
 */
#define MAX_HANDLES 64

/*
 * Helper macro for safe multi-allocation with cleanup.
 * Allocates multiple arrays and jumps to cleanup label if any fails.
 * All pointers must be initialized to NULL before using this macro.
 */
#define ALLOC_OR_FAIL(ptr, count, type) \
    do { \
        (ptr) = (type*)malloc((count) * sizeof(type)); \
        if (!(ptr)) goto cleanup; \
    } while(0)

/*
 * Helper to set out_count and return NULL (common failure pattern).
 */
static inline void* fail_with_count(int* out_count) {
    if (out_count) *out_count = 0;
    return NULL;
}

/* Handle table entry storing mesh and solution pointers */
typedef struct {
    MMG5_pMesh mesh;
    MMG5_pSol sol;
    int active;
} HandleEntry2D;

/* Global handle table for MMG2D (separate from MMG3D) */
static HandleEntry2D g_handles_2d[MAX_HANDLES];
static int g_initialized_2d = 0;

/* Initialize the handle table (called automatically on first use) */
static void ensure_initialized_2d(void) {
    if (!g_initialized_2d) {
        memset(g_handles_2d, 0, sizeof(g_handles_2d));
        g_initialized_2d = 1;
    }
}

/* Find a free handle slot, returns -1 if none available */
static int find_free_handle_2d(void) {
    ensure_initialized_2d();
    for (int i = 0; i < MAX_HANDLES; i++) {
        if (!g_handles_2d[i].active) {
            return i;
        }
    }
    return -1;
}

/* Validate a handle, returns 1 if valid, 0 otherwise */
static int validate_handle_2d(int handle) {
    ensure_initialized_2d();
    if (handle < 0 || handle >= MAX_HANDLES) {
        return 0;
    }
    return g_handles_2d[handle].active;
}

/**
 * Get the number of available (free) mesh handle slots.
 * Returns a value between 0 and MAX_HANDLES.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_get_available_handles(void) {
    ensure_initialized_2d();
    int count = 0;
    for (int i = 0; i < MAX_HANDLES; i++) {
        if (!g_handles_2d[i].active) {
            count++;
        }
    }
    return count;
}

/**
 * Get the maximum number of concurrent mesh handles supported.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_get_max_handles(void) {
    return MAX_HANDLES;
}

/**
 * Initialize a new MMG2D mesh and solution structure.
 * Returns a handle (0-63) on success, -1 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_init(void) {
    int handle = find_free_handle_2d();
    if (handle < 0) {
        return -1;  /* No free handles */
    }

    MMG5_pMesh mesh = NULL;
    MMG5_pSol sol = NULL;

    int result = MMG2D_Init_mesh(
        MMG5_ARG_start,
        MMG5_ARG_ppMesh, &mesh,
        MMG5_ARG_ppMet, &sol,
        MMG5_ARG_end
    );

    if (result != 1 || mesh == NULL) {
        return -1;  /* Initialization failed */
    }

    /* Initialize default parameters */
    MMG2D_Init_parameters(mesh);

    /* Store in handle table */
    g_handles_2d[handle].mesh = mesh;
    g_handles_2d[handle].sol = sol;
    g_handles_2d[handle].active = 1;

    return handle;
}

/**
 * Free a mesh and its associated solution.
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_free(int handle) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    MMG5_pMesh mesh = g_handles_2d[handle].mesh;
    MMG5_pSol sol = g_handles_2d[handle].sol;

    MMG2D_Free_all(
        MMG5_ARG_start,
        MMG5_ARG_ppMesh, &mesh,
        MMG5_ARG_ppMet, &sol,
        MMG5_ARG_end
    );

    g_handles_2d[handle].mesh = NULL;
    g_handles_2d[handle].sol = NULL;
    g_handles_2d[handle].active = 0;

    return 1;
}

/**
 * Set mesh size (allocate memory for mesh entities).
 * For 2D meshes: np (vertices), nt (triangles), nquad (quadrilaterals), na (edges)
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_mesh_size(int handle, int np, int nt, int nquad, int na) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_meshSize(
        g_handles_2d[handle].mesh,
        (MMG5_int)np,      /* number of vertices */
        (MMG5_int)nt,      /* number of triangles */
        (MMG5_int)nquad,   /* number of quadrilaterals */
        (MMG5_int)na       /* number of edges */
    );
}

/**
 * Get mesh size.
 * Output parameters are pointers allocated by the caller.
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_get_mesh_size(int handle, int* np, int* nt, int* nquad, int* na) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    MMG5_int _np, _nt, _nquad, _na;

    int result = MMG2D_Get_meshSize(
        g_handles_2d[handle].mesh,
        &_np, &_nt, &_nquad, &_na
    );

    if (result == 1) {
        if (np) *np = (int)_np;
        if (nt) *nt = (int)_nt;
        if (nquad) *nquad = (int)_nquad;
        if (na) *na = (int)_na;
    }

    return result;
}

/**
 * Set a single vertex.
 * For 2D: (x, y) coordinates.
 * pos is 1-indexed (MMG convention).
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_vertex(int handle, double x, double y, int ref, int pos) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_vertex(
        g_handles_2d[handle].mesh,
        x, y,
        (MMG5_int)ref,
        (MMG5_int)pos
    );
}

/**
 * Set all vertices at once (bulk operation).
 * vertices: array of [x0, y0, x1, y1, ...] (2*np doubles)
 * refs: array of np integers (can be NULL for ref=0)
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_vertices(int handle, double* vertices, int* refs) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_vertices(
        g_handles_2d[handle].mesh,
        vertices,
        (MMG5_int*)refs
    );
}

/**
 * Get all vertices.
 * Allocates and returns a pointer to the vertex array [x0, y0, x1, y1, ...].
 * out_count receives the number of vertices.
 * Caller must free the returned pointer using mmg2d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
double* mmg2d_get_vertices(int handle, int* out_count) {
    if (!validate_handle_2d(handle))
        return fail_with_count(out_count);

    MMG5_int np, nt, nquad, na;
    if (MMG2D_Get_meshSize(g_handles_2d[handle].mesh, &np, &nt, &nquad, &na) != 1)
        return fail_with_count(out_count);

    if (np == 0)
        return fail_with_count(out_count);

    /* Initialize all pointers to NULL for safe cleanup */
    double* vertices = NULL;
    MMG5_int* refs = NULL;
    int* corners = NULL;
    int* required = NULL;

    /* Allocate all arrays - goto cleanup on any failure */
    ALLOC_OR_FAIL(vertices, 2 * np, double);
    ALLOC_OR_FAIL(refs, np, MMG5_int);
    ALLOC_OR_FAIL(corners, np, int);
    ALLOC_OR_FAIL(required, np, int);

    int result = MMG2D_Get_vertices(
        g_handles_2d[handle].mesh, vertices, refs, corners, required
    );

    free(refs);
    free(corners);
    free(required);

    if (result != 1) {
        free(vertices);
        return fail_with_count(out_count);
    }

    if (out_count) *out_count = (int)np;
    return vertices;

cleanup:
    free(vertices);
    free(refs);
    free(corners);
    free(required);
    return fail_with_count(out_count);
}

/**
 * Set a single triangle.
 * v0, v1, v2 are vertex indices (1-indexed, MMG convention).
 * pos is 1-indexed.
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_triangle(int handle, int v0, int v1, int v2, int ref, int pos) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_triangle(
        g_handles_2d[handle].mesh,
        (MMG5_int)v0, (MMG5_int)v1, (MMG5_int)v2,
        (MMG5_int)ref,
        (MMG5_int)pos
    );
}

/**
 * Set all triangles at once (bulk operation).
 * tria: array of [v0_0, v1_0, v2_0, v0_1, ...] (3*nt integers, 1-indexed)
 * refs: array of nt integers (can be NULL for ref=0)
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_triangles(int handle, int* tria, int* refs) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_triangles(
        g_handles_2d[handle].mesh,
        (MMG5_int*)tria,
        (MMG5_int*)refs
    );
}

/**
 * Get all triangles.
 * Allocates and returns a pointer to the triangles array [v0_0, v1_0, v2_0, ...].
 * out_count receives the number of triangles.
 * Caller must free the returned pointer using mmg2d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
int* mmg2d_get_triangles(int handle, int* out_count) {
    if (!validate_handle_2d(handle))
        return fail_with_count(out_count);

    MMG5_int np, nt, nquad, na;
    if (MMG2D_Get_meshSize(g_handles_2d[handle].mesh, &np, &nt, &nquad, &na) != 1)
        return fail_with_count(out_count);

    if (nt == 0)
        return fail_with_count(out_count);

    /* Initialize all pointers to NULL for safe cleanup */
    MMG5_int* tria = NULL;
    MMG5_int* refs = NULL;
    int* required = NULL;

    /* Allocate all arrays - goto cleanup on any failure */
    ALLOC_OR_FAIL(tria, 3 * nt, MMG5_int);
    ALLOC_OR_FAIL(refs, nt, MMG5_int);
    ALLOC_OR_FAIL(required, nt, int);

    int result = MMG2D_Get_triangles(
        g_handles_2d[handle].mesh, tria, refs, required
    );

    free(refs);
    free(required);

    if (result != 1) {
        free(tria);
        return fail_with_count(out_count);
    }

    if (out_count) *out_count = (int)nt;
    return (int*)tria;  /* MMG5_int is int32_t, same as int */

cleanup:
    free(tria);
    free(refs);
    free(required);
    return fail_with_count(out_count);
}

/**
 * Set a single edge.
 * v0, v1 are vertex indices (1-indexed, MMG convention).
 * pos is 1-indexed.
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_edge(int handle, int v0, int v1, int ref, int pos) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_edge(
        g_handles_2d[handle].mesh,
        (MMG5_int)v0, (MMG5_int)v1,
        (MMG5_int)ref,
        (MMG5_int)pos
    );
}

/**
 * Set all edges at once (bulk operation).
 * edges: array of [v0_0, v1_0, v0_1, v1_1, ...] (2*na integers, 1-indexed)
 * refs: array of na integers (can be NULL for ref=0)
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_edges(int handle, int* edges, int* refs) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_edges(
        g_handles_2d[handle].mesh,
        (MMG5_int*)edges,
        (MMG5_int*)refs
    );
}

/**
 * Get all edges.
 * Allocates and returns a pointer to the edges array [v0_0, v1_0, ...].
 * out_count receives the number of edges.
 * Caller must free the returned pointer using mmg2d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
int* mmg2d_get_edges(int handle, int* out_count) {
    if (!validate_handle_2d(handle))
        return fail_with_count(out_count);

    MMG5_int np, nt, nquad, na;
    if (MMG2D_Get_meshSize(g_handles_2d[handle].mesh, &np, &nt, &nquad, &na) != 1)
        return fail_with_count(out_count);

    if (na == 0)
        return fail_with_count(out_count);

    /* Initialize all pointers to NULL for safe cleanup */
    MMG5_int* edges = NULL;
    MMG5_int* refs = NULL;
    int* ridges = NULL;
    int* required = NULL;

    /* Allocate all arrays - goto cleanup on any failure */
    ALLOC_OR_FAIL(edges, 2 * na, MMG5_int);
    ALLOC_OR_FAIL(refs, na, MMG5_int);
    ALLOC_OR_FAIL(ridges, na, int);
    ALLOC_OR_FAIL(required, na, int);

    int result = MMG2D_Get_edges(
        g_handles_2d[handle].mesh, edges, refs, ridges, required
    );

    free(refs);
    free(ridges);
    free(required);

    if (result != 1) {
        free(edges);
        return fail_with_count(out_count);
    }

    if (out_count) *out_count = (int)na;
    return (int*)edges;  /* MMG5_int is int32_t, same as int */

cleanup:
    free(edges);
    free(refs);
    free(ridges);
    free(required);
    return fail_with_count(out_count);
}

/**
 * Set an integer parameter.
 * iparam: one of the MMG2D_IPARAM_* values
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_iparameter(int handle, int iparam, int val) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_iparameter(
        g_handles_2d[handle].mesh,
        g_handles_2d[handle].sol,
        iparam,
        (MMG5_int)val
    );
}

/**
 * Set a double parameter.
 * dparam: one of the MMG2D_DPARAM_* values
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_dparameter(int handle, int dparam, double val) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_dparameter(
        g_handles_2d[handle].mesh,
        g_handles_2d[handle].sol,
        dparam,
        val
    );
}

/**
 * Set the solution size (allocate memory for solution data).
 * @param typEntity - Type of entity (1 = vertex)
 * @param np - Number of entities
 * @param typSol - Type of solution (1 = scalar, 2 = vector, 3 = tensor)
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_sol_size(int handle, int typEntity, int np, int typSol) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_solSize(
        g_handles_2d[handle].mesh,
        g_handles_2d[handle].sol,
        typEntity,
        (MMG5_int)np,
        typSol
    );
}

/**
 * Get the solution size information.
 * Output parameters are pointers allocated by the caller.
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_get_sol_size(int handle, int* typEntity, int* np, int* typSol) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    MMG5_int _np;
    int _typEntity, _typSol;

    int result = MMG2D_Get_solSize(
        g_handles_2d[handle].mesh,
        g_handles_2d[handle].sol,
        &_typEntity,
        &_np,
        &_typSol
    );

    if (result == 1) {
        if (typEntity) *typEntity = _typEntity;
        if (np) *np = (int)_np;
        if (typSol) *typSol = _typSol;
    }

    return result;
}

/**
 * Set all scalar solution values at once (bulk operation).
 * values: array of np doubles (one per vertex)
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_scalar_sols(int handle, double* values) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_scalarSols(g_handles_2d[handle].sol, values);
}

/**
 * Get all scalar solution values.
 * Allocates and returns a pointer to the values array.
 * out_count receives the number of values.
 * Caller must free the returned pointer using mmg2d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
double* mmg2d_get_scalar_sols(int handle, int* out_count) {
    if (!validate_handle_2d(handle)) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Get solution size to determine number of entities */
    int typEntity, typSol;
    MMG5_int np;
    if (MMG2D_Get_solSize(g_handles_2d[handle].mesh, g_handles_2d[handle].sol,
                          &typEntity, &np, &typSol) != 1) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (np == 0 || typSol != 1) { /* 1 = MMG5_Scalar */
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Allocate output array */
    double* values = (double*)malloc(np * sizeof(double));
    if (!values) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    int result = MMG2D_Get_scalarSols(g_handles_2d[handle].sol, values);
    if (result != 1) {
        free(values);
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (out_count) *out_count = (int)np;
    return values;
}

/**
 * Set all tensor solution values at once (bulk operation).
 * values: array of np*3 doubles (3 components per vertex: m11, m12, m22)
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_set_tensor_sols(int handle, double* values) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }

    return MMG2D_Set_tensorSols(g_handles_2d[handle].sol, values);
}

/**
 * Get all tensor solution values.
 * Allocates and returns a pointer to the values array.
 * out_count receives the number of vertices (array size is out_count * 3).
 * Caller must free the returned pointer using mmg2d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
double* mmg2d_get_tensor_sols(int handle, int* out_count) {
    if (!validate_handle_2d(handle)) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Get solution size to determine number of entities */
    int typEntity, typSol;
    MMG5_int np;
    if (MMG2D_Get_solSize(g_handles_2d[handle].mesh, g_handles_2d[handle].sol,
                          &typEntity, &np, &typSol) != 1) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (np == 0 || typSol != 3) { /* 3 = MMG5_Tensor */
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Allocate output array: 3 components per vertex for 2D tensor */
    double* values = (double*)malloc(np * 3 * sizeof(double));
    if (!values) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    int result = MMG2D_Get_tensorSols(g_handles_2d[handle].sol, values);
    if (result != 1) {
        free(values);
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (out_count) *out_count = (int)np;
    return values;
}

/**
 * Run the MMG2D remeshing algorithm.
 * Returns MMG5_SUCCESS (0) on success, or an error code.
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_remesh(int handle) {
    if (!validate_handle_2d(handle)) {
        return -1;
    }

    return MMG2D_mmg2dlib(
        g_handles_2d[handle].mesh,
        g_handles_2d[handle].sol
    );
}

/**
 * Free an array returned by mmg2d_get_* functions.
 */
EMSCRIPTEN_KEEPALIVE
void mmg2d_free_array(void* ptr) {
    if (ptr) {
        free(ptr);
    }
}

/**
 * Load a mesh from a file in the virtual filesystem.
 * @param handle - The mesh handle
 * @param filename - Path to the mesh file in the virtual filesystem
 * @returns 1 on success, 0 on failure
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_load_mesh(int handle, const char* filename) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }
    return MMG2D_loadMesh(g_handles_2d[handle].mesh, filename);
}

/**
 * Save a mesh to a file in the virtual filesystem.
 * @param handle - The mesh handle
 * @param filename - Path to save the mesh file in the virtual filesystem
 * @returns 1 on success, 0 on failure
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_save_mesh(int handle, const char* filename) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }
    return MMG2D_saveMesh(g_handles_2d[handle].mesh, filename);
}

/**
 * Load a solution from a file in the virtual filesystem.
 * @param handle - The mesh handle
 * @param filename - Path to the solution file in the virtual filesystem
 * @returns 1 on success, 0 on failure
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_load_sol(int handle, const char* filename) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }
    return MMG2D_loadSol(g_handles_2d[handle].mesh, g_handles_2d[handle].sol, filename);
}

/**
 * Save a solution to a file in the virtual filesystem.
 * @param handle - The mesh handle
 * @param filename - Path to save the solution file in the virtual filesystem
 * @returns 1 on success, 0 on failure
 */
EMSCRIPTEN_KEEPALIVE
int mmg2d_save_sol(int handle, const char* filename) {
    if (!validate_handle_2d(handle)) {
        return 0;
    }
    return MMG2D_saveSol(g_handles_2d[handle].mesh, g_handles_2d[handle].sol, filename);
}

/**
 * Get the quality of a single triangle.
 * @param handle - The mesh handle
 * @param k - The triangle index (1-indexed, MMG convention)
 * @returns Quality value between 0 (degenerate) and 1 (best), or 0 on failure
 */
EMSCRIPTEN_KEEPALIVE
double mmg2d_get_triangle_quality(int handle, int k) {
    if (!validate_handle_2d(handle)) {
        return 0.0;
    }
    return MMG2D_Get_triangleQuality(
        g_handles_2d[handle].mesh,
        g_handles_2d[handle].sol,
        (MMG5_int)k
    );
}

/**
 * Get quality values for all triangles.
 * Allocates and returns a pointer to the quality array.
 * out_count receives the number of triangles.
 * Caller must free the returned pointer using mmg2d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
double* mmg2d_get_triangles_qualities(int handle, int* out_count) {
    if (!validate_handle_2d(handle)) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    MMG5_int np, nt, nquad, na;
    if (MMG2D_Get_meshSize(g_handles_2d[handle].mesh, &np, &nt, &nquad, &na) != 1) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (nt == 0) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Allocate output array */
    double* qualities = (double*)malloc(nt * sizeof(double));
    if (!qualities) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Get quality for each triangle (1-indexed) */
    for (MMG5_int k = 1; k <= nt; k++) {
        qualities[k - 1] = MMG2D_Get_triangleQuality(
            g_handles_2d[handle].mesh,
            g_handles_2d[handle].sol,
            k
        );
    }

    if (out_count) *out_count = (int)nt;
    return qualities;
}
