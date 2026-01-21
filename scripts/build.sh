#!/usr/bin/env bash
# Build mmg-wasm using Emscripten

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Build type: Release (default) or Debug
BUILD_TYPE="${1:-Release}"

# Validate build type
if [[ "$BUILD_TYPE" != "Release" && "$BUILD_TYPE" != "Debug" ]]; then
    echo "Error: Build type must be 'Release' or 'Debug'"
    echo "Usage: $0 [Release|Debug]"
    exit 1
fi

echo "Build type: $BUILD_TYPE"
echo

# Check if toolchain is available
if ! "$SCRIPT_DIR/check-toolchain.sh"; then
    echo
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "The Emscripten toolchain is not properly configured."
    echo
    echo "You have several options:"
    echo
    echo "  Option 1: Install emsdk locally"
    echo "    ./scripts/setup-emsdk.sh"
    echo "    source ~/.emsdk/emsdk_env.sh"
    echo "    bun run build"
    echo
    echo "  Option 2: Use Docker (no local installation needed)"
    echo "    bun run build:docker"
    echo
    echo "  Option 3: Manual emsdk setup"
    echo "    See: https://emscripten.org/docs/getting_started/downloads.html"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi

echo
echo "Configuring with CMake..."
cd "$PROJECT_DIR"

emcmake cmake -G Ninja -B build \
    -DCMAKE_BUILD_TYPE="$BUILD_TYPE" \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON

echo
echo "Building..."
cmake --build build --parallel

echo
echo "Build complete! Output files in build/"
