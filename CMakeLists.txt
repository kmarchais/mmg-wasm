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
include(FetchMMG)

# Output build info
message(STATUS "")
message(STATUS "=== mmg-wasm ${PROJECT_VERSION} ===")
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Emscripten: ${EMSCRIPTEN_VERSION}")
message(STATUS "")

# Placeholder for future binding targets
# The actual WASM bindings will be added in subsequent issues
# Example:
#   add_executable(mmg-wasm src/bindings.c)
#   target_link_libraries(mmg-wasm PRIVATE libmmg_a)
#   configure_wasm_target(mmg-wasm)

message(STATUS "Configuration complete. mmg library will be built as a static library.")
message(STATUS "WASM bindings will be added in subsequent development.")
