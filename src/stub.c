#include <emscripten.h>
#include "mmg/mmg3d/libmmg3d.h"

EMSCRIPTEN_KEEPALIVE
const char* mmg_version(void) {
    return MMG_VERSION_RELEASE;
}

EMSCRIPTEN_KEEPALIVE
const char* mmgwasm_version(void) {
    return "0.0.1";
}

EMSCRIPTEN_KEEPALIVE
int mmg_test_init(void) {
    MMG5_pMesh mesh = NULL;
    MMG5_pSol sol = NULL;

    int result = MMG3D_Init_mesh(
        MMG5_ARG_start,
        MMG5_ARG_ppMesh, &mesh,
        MMG5_ARG_ppMet, &sol,
        MMG5_ARG_end
    );

    if (result != 1 || mesh == NULL) return 0;

    MMG3D_Init_parameters(mesh);

    MMG3D_Free_all(
        MMG5_ARG_start,
        MMG5_ARG_ppMesh, &mesh,
        MMG5_ARG_ppMet, &sol,
        MMG5_ARG_end
    );

    return 1;
}
