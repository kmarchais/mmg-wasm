cmake_minimum_required(VERSION 3.29)
project(mmg-wasm VERSION 0.0.1 LANGUAGES C CXX)

# Ensure we're building with Emscripten
if(NOT EMSCRIPTEN)
    message(FATAL_ERROR
        "This project must be built with Emscripten.\n"
        "Use: emcmake cmake -G Ninja -B build\n"
        "Or run: ./scripts/build.sh\n"
        "See CONTRIBUTING.md for setup instructions."
    )
endif()

# Include our CMake modules
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
include(EmscriptenConfig)

# Create a package.json in the build directory to ensure generated JS files
# are treated as CommonJS (mmg's build tools use require())
file(WRITE "${CMAKE_BINARY_DIR}/package.json" "{\"type\": \"commonjs\"}\n")

include(FetchMMG)

# Output build info
message(STATUS "")
message(STATUS "=== mmg-wasm ${PROJECT_VERSION} ===")
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Emscripten: ${EMSCRIPTEN_VERSION}")
message(STATUS "")

# Create WASM target linking against mmg
add_executable(mmg src/stub.c src/mmg3d.c src/mmg2d.c src/mmgs.c)

target_link_libraries(mmg PRIVATE libmmg_a)

target_include_directories(mmg PRIVATE
    ${mmg_BINARY_DIR}/include
    ${mmg_SOURCE_DIR}/src
)

# Exported functions for JavaScript bindings (62 total)
set(MMG_EXPORTED_FUNCTIONS
    # Existing exports (5)
    '_mmg_version'
    '_mmgwasm_version'
    '_mmg_test_init'
    '_malloc'
    '_free'
    # MMG3D wrapper functions (19)
    '_mmg3d_init'
    '_mmg3d_free'
    '_mmg3d_get_available_handles'
    '_mmg3d_get_max_handles'
    '_mmg3d_set_mesh_size'
    '_mmg3d_get_mesh_size'
    '_mmg3d_set_vertex'
    '_mmg3d_set_vertices'
    '_mmg3d_get_vertices'
    '_mmg3d_set_tetrahedron'
    '_mmg3d_set_tetrahedra'
    '_mmg3d_get_tetrahedra'
    '_mmg3d_set_triangle'
    '_mmg3d_set_triangles'
    '_mmg3d_get_triangles'
    '_mmg3d_set_iparameter'
    '_mmg3d_set_dparameter'
    '_mmg3d_remesh'
    '_mmg3d_free_array'
    # MMG2D wrapper functions (19)
    '_mmg2d_init'
    '_mmg2d_free'
    '_mmg2d_get_available_handles'
    '_mmg2d_get_max_handles'
    '_mmg2d_set_mesh_size'
    '_mmg2d_get_mesh_size'
    '_mmg2d_set_vertex'
    '_mmg2d_set_vertices'
    '_mmg2d_get_vertices'
    '_mmg2d_set_triangle'
    '_mmg2d_set_triangles'
    '_mmg2d_get_triangles'
    '_mmg2d_set_edge'
    '_mmg2d_set_edges'
    '_mmg2d_get_edges'
    '_mmg2d_set_iparameter'
    '_mmg2d_set_dparameter'
    '_mmg2d_remesh'
    '_mmg2d_free_array'
    # MMGS wrapper functions (19)
    '_mmgs_init'
    '_mmgs_free'
    '_mmgs_get_available_handles'
    '_mmgs_get_max_handles'
    '_mmgs_set_mesh_size'
    '_mmgs_get_mesh_size'
    '_mmgs_set_vertex'
    '_mmgs_set_vertices'
    '_mmgs_get_vertices'
    '_mmgs_set_triangle'
    '_mmgs_set_triangles'
    '_mmgs_get_triangles'
    '_mmgs_set_edge'
    '_mmgs_set_edges'
    '_mmgs_get_edges'
    '_mmgs_set_iparameter'
    '_mmgs_set_dparameter'
    '_mmgs_remesh'
    '_mmgs_free_array'
)
list(JOIN MMG_EXPORTED_FUNCTIONS "," MMG_EXPORTED_FUNCTIONS_STR)

target_link_options(mmg PRIVATE
    "-sEXPORTED_FUNCTIONS=[${MMG_EXPORTED_FUNCTIONS_STR}]"
)

configure_wasm_target(mmg)
