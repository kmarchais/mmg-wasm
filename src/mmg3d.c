/**
 * MMG3D WebAssembly wrapper functions
 *
 * This file provides C wrapper functions that expose the MMG3D API to JavaScript
 * via Emscripten. It uses a handle-based memory management pattern where mesh/solution
 * pointer pairs are stored in a handle table and referenced by integer handles.
 *
 * The variadic MMG3D C API (using MMG5_ARG_*) cannot be called directly from JavaScript,
 * so these wrappers provide simple function signatures callable via cwrap.
 */

#include <emscripten.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include "mmg/mmg3d/libmmg3d.h"

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
 * Use mmg3d_get_available_handles() to check current capacity.
 */
#define MAX_HANDLES 64

/* Handle table entry storing mesh and solution pointers */
typedef struct {
    MMG5_pMesh mesh;
    MMG5_pSol sol;
    int active;
} HandleEntry;

/* Global handle table */
static HandleEntry g_handles[MAX_HANDLES];
static int g_initialized = 0;

/* Initialize the handle table (called automatically on first use) */
static void ensure_initialized(void) {
    if (!g_initialized) {
        memset(g_handles, 0, sizeof(g_handles));
        g_initialized = 1;
    }
}

/* Find a free handle slot, returns -1 if none available */
static int find_free_handle(void) {
    ensure_initialized();
    for (int i = 0; i < MAX_HANDLES; i++) {
        if (!g_handles[i].active) {
            return i;
        }
    }
    return -1;
}

/* Validate a handle, returns 1 if valid, 0 otherwise */
static int validate_handle(int handle) {
    ensure_initialized();
    if (handle < 0 || handle >= MAX_HANDLES) {
        return 0;
    }
    return g_handles[handle].active;
}

/**
 * Get the number of available (free) mesh handle slots.
 * Returns a value between 0 and MAX_HANDLES.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_get_available_handles(void) {
    ensure_initialized();
    int count = 0;
    for (int i = 0; i < MAX_HANDLES; i++) {
        if (!g_handles[i].active) {
            count++;
        }
    }
    return count;
}

/**
 * Get the maximum number of concurrent mesh handles supported.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_get_max_handles(void) {
    return MAX_HANDLES;
}

/**
 * Initialize a new MMG3D mesh and solution structure.
 * Returns a handle (0-63) on success, -1 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_init(void) {
    int handle = find_free_handle();
    if (handle < 0) {
        return -1;  /* No free handles */
    }

    MMG5_pMesh mesh = NULL;
    MMG5_pSol sol = NULL;

    int result = MMG3D_Init_mesh(
        MMG5_ARG_start,
        MMG5_ARG_ppMesh, &mesh,
        MMG5_ARG_ppMet, &sol,
        MMG5_ARG_end
    );

    if (result != 1 || mesh == NULL) {
        return -1;  /* Initialization failed */
    }

    /* Initialize default parameters */
    MMG3D_Init_parameters(mesh);

    /* Store in handle table */
    g_handles[handle].mesh = mesh;
    g_handles[handle].sol = sol;
    g_handles[handle].active = 1;

    return handle;
}

/**
 * Free a mesh and its associated solution.
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_free(int handle) {
    if (!validate_handle(handle)) {
        return 0;
    }

    MMG5_pMesh mesh = g_handles[handle].mesh;
    MMG5_pSol sol = g_handles[handle].sol;

    MMG3D_Free_all(
        MMG5_ARG_start,
        MMG5_ARG_ppMesh, &mesh,
        MMG5_ARG_ppMet, &sol,
        MMG5_ARG_end
    );

    g_handles[handle].mesh = NULL;
    g_handles[handle].sol = NULL;
    g_handles[handle].active = 0;

    return 1;
}

/**
 * Set mesh size (allocate memory for mesh entities).
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_set_mesh_size(int handle, int np, int ne, int nprism, int nt, int nquad, int na) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_meshSize(
        g_handles[handle].mesh,
        (MMG5_int)np,      /* number of vertices */
        (MMG5_int)ne,      /* number of tetrahedra */
        (MMG5_int)nprism,  /* number of prisms */
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
int mmg3d_get_mesh_size(int handle, int* np, int* ne, int* nprism, int* nt, int* nquad, int* na) {
    if (!validate_handle(handle)) {
        return 0;
    }

    MMG5_int _np, _ne, _nprism, _nt, _nquad, _na;

    int result = MMG3D_Get_meshSize(
        g_handles[handle].mesh,
        &_np, &_ne, &_nprism, &_nt, &_nquad, &_na
    );

    if (result == 1) {
        if (np) *np = (int)_np;
        if (ne) *ne = (int)_ne;
        if (nprism) *nprism = (int)_nprism;
        if (nt) *nt = (int)_nt;
        if (nquad) *nquad = (int)_nquad;
        if (na) *na = (int)_na;
    }

    return result;
}

/**
 * Set a single vertex.
 * pos is 1-indexed (MMG convention).
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_set_vertex(int handle, double x, double y, double z, int ref, int pos) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_vertex(
        g_handles[handle].mesh,
        x, y, z,
        (MMG5_int)ref,
        (MMG5_int)pos
    );
}

/**
 * Set all vertices at once (bulk operation).
 * vertices: array of [x0, y0, z0, x1, y1, z1, ...] (3*np doubles)
 * refs: array of np integers (can be NULL for ref=0)
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_set_vertices(int handle, double* vertices, int* refs) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_vertices(
        g_handles[handle].mesh,
        vertices,
        (MMG5_int*)refs
    );
}

/**
 * Get all vertices.
 * Allocates and returns a pointer to the vertex array [x0, y0, z0, x1, y1, z1, ...].
 * out_count receives the number of vertices.
 * Caller must free the returned pointer using mmg3d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
double* mmg3d_get_vertices(int handle, int* out_count) {
    if (!validate_handle(handle)) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    MMG5_int np, ne, nprism, nt, nquad, na;
    if (MMG3D_Get_meshSize(g_handles[handle].mesh, &np, &ne, &nprism, &nt, &nquad, &na) != 1) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (np == 0) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Allocate output array */
    double* vertices = (double*)malloc(3 * np * sizeof(double));
    if (!vertices) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* We need refs and corners arrays for the API but can discard them */
    MMG5_int* refs = (MMG5_int*)malloc(np * sizeof(MMG5_int));
    int* corners = (int*)malloc(np * sizeof(int));
    int* required = (int*)malloc(np * sizeof(int));

    if (!refs || !corners || !required) {
        free(vertices);
        free(refs);
        free(corners);
        free(required);
        if (out_count) *out_count = 0;
        return NULL;
    }

    int result = MMG3D_Get_vertices(
        g_handles[handle].mesh,
        vertices,
        refs,
        corners,
        required
    );

    free(refs);
    free(corners);
    free(required);

    if (result != 1) {
        free(vertices);
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (out_count) *out_count = (int)np;
    return vertices;
}

/**
 * Set a single tetrahedron.
 * v0, v1, v2, v3 are vertex indices (1-indexed, MMG convention).
 * pos is 1-indexed.
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_set_tetrahedron(int handle, int v0, int v1, int v2, int v3, int ref, int pos) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_tetrahedron(
        g_handles[handle].mesh,
        (MMG5_int)v0, (MMG5_int)v1, (MMG5_int)v2, (MMG5_int)v3,
        (MMG5_int)ref,
        (MMG5_int)pos
    );
}

/**
 * Set all tetrahedra at once (bulk operation).
 * tetra: array of [v0_0, v1_0, v2_0, v3_0, v0_1, ...] (4*ne integers, 1-indexed)
 * refs: array of ne integers (can be NULL for ref=0)
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_set_tetrahedra(int handle, int* tetra, int* refs) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_tetrahedra(
        g_handles[handle].mesh,
        (MMG5_int*)tetra,
        (MMG5_int*)refs
    );
}

/**
 * Get all tetrahedra.
 * Allocates and returns a pointer to the tetrahedra array [v0_0, v1_0, v2_0, v3_0, ...].
 * out_count receives the number of tetrahedra.
 * Caller must free the returned pointer using mmg3d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
int* mmg3d_get_tetrahedra(int handle, int* out_count) {
    if (!validate_handle(handle)) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    MMG5_int np, ne, nprism, nt, nquad, na;
    if (MMG3D_Get_meshSize(g_handles[handle].mesh, &np, &ne, &nprism, &nt, &nquad, &na) != 1) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (ne == 0) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Allocate output array (4 vertices per tetrahedron) */
    MMG5_int* tetra = (MMG5_int*)malloc(4 * ne * sizeof(MMG5_int));
    if (!tetra) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* We need refs and required arrays for the API but can discard them */
    MMG5_int* refs = (MMG5_int*)malloc(ne * sizeof(MMG5_int));
    int* required = (int*)malloc(ne * sizeof(int));

    if (!refs || !required) {
        free(tetra);
        free(refs);
        free(required);
        if (out_count) *out_count = 0;
        return NULL;
    }

    int result = MMG3D_Get_tetrahedra(
        g_handles[handle].mesh,
        tetra,
        refs,
        required
    );

    free(refs);
    free(required);

    if (result != 1) {
        free(tetra);
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (out_count) *out_count = (int)ne;
    return (int*)tetra;  /* MMG5_int is int32_t, same as int */
}

/**
 * Set a single triangle.
 * v0, v1, v2 are vertex indices (1-indexed, MMG convention).
 * pos is 1-indexed.
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_set_triangle(int handle, int v0, int v1, int v2, int ref, int pos) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_triangle(
        g_handles[handle].mesh,
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
int mmg3d_set_triangles(int handle, int* tria, int* refs) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_triangles(
        g_handles[handle].mesh,
        (MMG5_int*)tria,
        (MMG5_int*)refs
    );
}

/**
 * Get all triangles.
 * Allocates and returns a pointer to the triangles array [v0_0, v1_0, v2_0, ...].
 * out_count receives the number of triangles.
 * Caller must free the returned pointer using mmg3d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
int* mmg3d_get_triangles(int handle, int* out_count) {
    if (!validate_handle(handle)) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    MMG5_int np, ne, nprism, nt, nquad, na;
    if (MMG3D_Get_meshSize(g_handles[handle].mesh, &np, &ne, &nprism, &nt, &nquad, &na) != 1) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (nt == 0) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Allocate output array (3 vertices per triangle) */
    MMG5_int* tria = (MMG5_int*)malloc(3 * nt * sizeof(MMG5_int));
    if (!tria) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* We need refs and required arrays for the API but can discard them */
    MMG5_int* refs = (MMG5_int*)malloc(nt * sizeof(MMG5_int));
    int* required = (int*)malloc(nt * sizeof(int));

    if (!refs || !required) {
        free(tria);
        free(refs);
        free(required);
        if (out_count) *out_count = 0;
        return NULL;
    }

    int result = MMG3D_Get_triangles(
        g_handles[handle].mesh,
        tria,
        refs,
        required
    );

    free(refs);
    free(required);

    if (result != 1) {
        free(tria);
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (out_count) *out_count = (int)nt;
    return (int*)tria;  /* MMG5_int is int32_t, same as int */
}

/**
 * Set an integer parameter.
 * iparam: one of the MMG3D_IPARAM_* values
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_set_iparameter(int handle, int iparam, int val) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_iparameter(
        g_handles[handle].mesh,
        g_handles[handle].sol,
        iparam,
        (MMG5_int)val
    );
}

/**
 * Set a double parameter.
 * dparam: one of the MMG3D_DPARAM_* values
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_set_dparameter(int handle, int dparam, double val) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_dparameter(
        g_handles[handle].mesh,
        g_handles[handle].sol,
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
int mmg3d_set_sol_size(int handle, int typEntity, int np, int typSol) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_solSize(
        g_handles[handle].mesh,
        g_handles[handle].sol,
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
int mmg3d_get_sol_size(int handle, int* typEntity, int* np, int* typSol) {
    if (!validate_handle(handle)) {
        return 0;
    }

    MMG5_int _np;
    int _typEntity, _typSol;

    int result = MMG3D_Get_solSize(
        g_handles[handle].mesh,
        g_handles[handle].sol,
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
int mmg3d_set_scalar_sols(int handle, double* values) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_scalarSols(g_handles[handle].sol, values);
}

/**
 * Get all scalar solution values.
 * Allocates and returns a pointer to the values array.
 * out_count receives the number of values.
 * Caller must free the returned pointer using mmg3d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
double* mmg3d_get_scalar_sols(int handle, int* out_count) {
    if (!validate_handle(handle)) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Get solution size to determine number of entities */
    int typEntity, typSol;
    MMG5_int np;
    if (MMG3D_Get_solSize(g_handles[handle].mesh, g_handles[handle].sol,
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

    int result = MMG3D_Get_scalarSols(g_handles[handle].sol, values);
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
 * values: array of np*6 doubles (6 components per vertex: m11, m12, m13, m22, m23, m33)
 * Returns 1 on success, 0 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_set_tensor_sols(int handle, double* values) {
    if (!validate_handle(handle)) {
        return 0;
    }

    return MMG3D_Set_tensorSols(g_handles[handle].sol, values);
}

/**
 * Get all tensor solution values.
 * Allocates and returns a pointer to the values array.
 * out_count receives the number of vertices (array size is out_count * 6).
 * Caller must free the returned pointer using mmg3d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
double* mmg3d_get_tensor_sols(int handle, int* out_count) {
    if (!validate_handle(handle)) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Get solution size to determine number of entities */
    int typEntity, typSol;
    MMG5_int np;
    if (MMG3D_Get_solSize(g_handles[handle].mesh, g_handles[handle].sol,
                          &typEntity, &np, &typSol) != 1) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (np == 0 || typSol != 3) { /* 3 = MMG5_Tensor */
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Allocate output array: 6 components per vertex for 3D tensor */
    double* values = (double*)malloc(np * 6 * sizeof(double));
    if (!values) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    int result = MMG3D_Get_tensorSols(g_handles[handle].sol, values);
    if (result != 1) {
        free(values);
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (out_count) *out_count = (int)np;
    return values;
}

/**
 * Run the MMG3D remeshing algorithm.
 * Returns MMG5_SUCCESS (0) on success, or an error code.
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_remesh(int handle) {
    if (!validate_handle(handle)) {
        return -1;
    }

    return MMG3D_mmg3dlib(
        g_handles[handle].mesh,
        g_handles[handle].sol
    );
}

/**
 * Free an array returned by mmg3d_get_* functions.
 */
EMSCRIPTEN_KEEPALIVE
void mmg3d_free_array(void* ptr) {
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
int mmg3d_load_mesh(int handle, const char* filename) {
    if (!validate_handle(handle)) {
        return 0;
    }
    return MMG3D_loadMesh(g_handles[handle].mesh, filename);
}

/**
 * Save a mesh to a file in the virtual filesystem.
 * @param handle - The mesh handle
 * @param filename - Path to save the mesh file in the virtual filesystem
 * @returns 1 on success, 0 on failure
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_save_mesh(int handle, const char* filename) {
    if (!validate_handle(handle)) {
        return 0;
    }
    return MMG3D_saveMesh(g_handles[handle].mesh, filename);
}

/**
 * Load a solution from a file in the virtual filesystem.
 * @param handle - The mesh handle
 * @param filename - Path to the solution file in the virtual filesystem
 * @returns 1 on success, 0 on failure
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_load_sol(int handle, const char* filename) {
    if (!validate_handle(handle)) {
        return 0;
    }
    return MMG3D_loadSol(g_handles[handle].mesh, g_handles[handle].sol, filename);
}

/**
 * Save a solution to a file in the virtual filesystem.
 * @param handle - The mesh handle
 * @param filename - Path to save the solution file in the virtual filesystem
 * @returns 1 on success, 0 on failure
 */
EMSCRIPTEN_KEEPALIVE
int mmg3d_save_sol(int handle, const char* filename) {
    if (!validate_handle(handle)) {
        return 0;
    }
    return MMG3D_saveSol(g_handles[handle].mesh, g_handles[handle].sol, filename);
}

/**
 * Get the quality of a single tetrahedron.
 * @param handle - The mesh handle
 * @param k - The tetrahedron index (1-indexed, MMG convention)
 * @returns Quality value between 0 (degenerate) and 1 (best), or 0 on failure
 */
EMSCRIPTEN_KEEPALIVE
double mmg3d_get_tetrahedron_quality(int handle, int k) {
    if (!validate_handle(handle)) {
        return 0.0;
    }
    return MMG3D_Get_tetrahedronQuality(
        g_handles[handle].mesh,
        g_handles[handle].sol,
        (MMG5_int)k
    );
}

/**
 * Get quality values for all tetrahedra.
 * Allocates and returns a pointer to the quality array.
 * out_count receives the number of tetrahedra.
 * Caller must free the returned pointer using mmg3d_free_array.
 * Returns NULL on failure.
 */
EMSCRIPTEN_KEEPALIVE
double* mmg3d_get_tetrahedra_qualities(int handle, int* out_count) {
    if (!validate_handle(handle)) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    MMG5_int np, ne, nprism, nt, nquad, na;
    if (MMG3D_Get_meshSize(g_handles[handle].mesh, &np, &ne, &nprism, &nt, &nquad, &na) != 1) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    if (ne == 0) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Allocate output array */
    double* qualities = (double*)malloc(ne * sizeof(double));
    if (!qualities) {
        if (out_count) *out_count = 0;
        return NULL;
    }

    /* Get quality for each tetrahedron (1-indexed) */
    for (MMG5_int k = 1; k <= ne; k++) {
        qualities[k - 1] = MMG3D_Get_tetrahedronQuality(
            g_handles[handle].mesh,
            g_handles[handle].sol,
            k
        );
    }

    if (out_count) *out_count = (int)ne;
    return qualities;
}

