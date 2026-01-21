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
add_executable(mmg src/stub.c)

target_link_libraries(mmg PRIVATE libmmg_a)

target_include_directories(mmg PRIVATE
    ${mmg_BINARY_DIR}/include
    ${mmg_SOURCE_DIR}/src
)

target_link_options(mmg PRIVATE
    -sEXPORTED_FUNCTIONS=['_mmg_version','_mmgwasm_version','_mmg_test_init','_malloc','_free']
)

configure_wasm_target(mmg)
