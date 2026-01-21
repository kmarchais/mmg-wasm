# Emscripten configuration for mmg-wasm
#
# This module provides:
# - Emscripten version checking
# - Common link flags for WASM builds
# - Helper function for configuring WASM targets

# Minimum recommended Emscripten version
set(EMSCRIPTEN_MIN_VERSION "4.0.10")

# Check Emscripten version
if(DEFINED ENV{EMSDK_VERSION})
    set(EMSCRIPTEN_VERSION "$ENV{EMSDK_VERSION}")
elseif(DEFINED EMSCRIPTEN_VERSION)
    # Already set, use it
else()
    # Try to get version from emcc
    execute_process(
        COMMAND emcc --version
        OUTPUT_VARIABLE EMCC_VERSION_OUTPUT
        OUTPUT_STRIP_TRAILING_WHITESPACE
        ERROR_QUIET
    )
    if(EMCC_VERSION_OUTPUT MATCHES "([0-9]+\\.[0-9]+\\.[0-9]+)")
        set(EMSCRIPTEN_VERSION "${CMAKE_MATCH_1}")
    else()
        set(EMSCRIPTEN_VERSION "unknown")
    endif()
endif()

message(STATUS "Emscripten version: ${EMSCRIPTEN_VERSION}")

# Warn if version is below minimum
if(NOT EMSCRIPTEN_VERSION STREQUAL "unknown")
    if(EMSCRIPTEN_VERSION VERSION_LESS EMSCRIPTEN_MIN_VERSION)
        message(WARNING
            "Emscripten version ${EMSCRIPTEN_VERSION} is below recommended ${EMSCRIPTEN_MIN_VERSION}. "
            "Consider updating: ./scripts/setup-emsdk.sh"
        )
    endif()
endif()

# Common Emscripten link flags for all WASM targets
set(MMG_WASM_LINK_FLAGS
    # ES6 module output
    -sEXPORT_ES6=1
    -sMODULARIZE=1

    # Memory configuration
    -sALLOW_MEMORY_GROWTH=1
    -sINITIAL_MEMORY=16MB
    -sSTACK_SIZE=1MB

    # Exception handling (using WASM exceptions for better performance)
    -fwasm-exceptions

    # Environment - we only target web/worker
    -sENVIRONMENT=web,worker

    # Filesystem support (needed for mmg's file I/O simulation)
    -sFORCE_FILESYSTEM=1

    # Export malloc/free for memory management from JS
    -sEXPORTED_FUNCTIONS=['_malloc','_free']
    -sEXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','stringToUTF8','getValue','setValue']
)

# Additional flags for Release builds
set(MMG_WASM_LINK_FLAGS_RELEASE
    -O3
    --closure=1
    -flto
)

# Additional flags for Debug builds
set(MMG_WASM_LINK_FLAGS_DEBUG
    -O0
    -g
    -sASSERTIONS=2
    -sSAFE_HEAP=1
)

# Helper function to configure a WASM target with standard mmg-wasm settings
function(configure_wasm_target TARGET_NAME)
    # Apply common link flags
    target_link_options(${TARGET_NAME} PRIVATE ${MMG_WASM_LINK_FLAGS})

    # Apply build-type specific flags
    target_link_options(${TARGET_NAME} PRIVATE
        $<$<CONFIG:Release>:${MMG_WASM_LINK_FLAGS_RELEASE}>
        $<$<CONFIG:Debug>:${MMG_WASM_LINK_FLAGS_DEBUG}>
    )

    # Set output to .js (Emscripten generates both .js and .wasm)
    set_target_properties(${TARGET_NAME} PROPERTIES
        SUFFIX ".js"
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/dist"
    )

    message(STATUS "Configured WASM target: ${TARGET_NAME}")
endfunction()
