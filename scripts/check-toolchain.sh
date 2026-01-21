#!/usr/bin/env bash
# Check that the Emscripten toolchain is properly installed and configured

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0

check_command() {
    local cmd=$1
    local name=$2
    local install_hint=$3

    if command -v "$cmd" &> /dev/null; then
        local version
        version=$("$cmd" --version 2>&1 | head -n1)
        echo -e "${GREEN}✓${NC} $name: $version"
    else
        echo -e "${RED}✗${NC} $name not found"
        echo -e "  ${YELLOW}→${NC} $install_hint"
        ((errors++))
    fi
}

check_version() {
    local cmd=$1
    local name=$2
    local min_version=$3
    local install_hint=$4

    if command -v "$cmd" &> /dev/null; then
        local version
        version=$("$cmd" --version 2>&1 | head -n1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n1)

        if [ -n "$version" ]; then
            # Compare versions using sort -V for proper semantic versioning
            local lowest
            lowest=$(printf '%s\n%s' "$min_version" "$version" | sort -V | head -n1)

            if [ "$lowest" = "$min_version" ]; then
                echo -e "${GREEN}✓${NC} $name: $version (>= $min_version)"
            else
                echo -e "${RED}✗${NC} $name: $version (requires >= $min_version)"
                echo -e "  ${YELLOW}→${NC} $install_hint"
                ((errors++))
            fi
        else
            echo -e "${YELLOW}?${NC} $name: version unknown"
        fi
    else
        echo -e "${RED}✗${NC} $name not found"
        echo -e "  ${YELLOW}→${NC} $install_hint"
        ((errors++))
    fi
}

echo "Checking Emscripten toolchain..."
echo

# Check for Emscripten compiler
check_command "emcc" "Emscripten (emcc)" "Run ./scripts/setup-emsdk.sh or see https://emscripten.org/docs/getting_started/downloads.html"

# Check for emcmake
check_command "emcmake" "emcmake" "Ensure emsdk_env.sh is sourced in your shell"

# Check CMake version (3.24+ for FetchContent improvements)
check_version "cmake" "CMake" "3.24" "Install CMake 3.24+ from https://cmake.org/download/"

# Check for Ninja
check_command "ninja" "Ninja" "Install with: apt install ninja-build (Linux) / brew install ninja (macOS)"

echo

if [ $errors -gt 0 ]; then
    echo -e "${RED}Toolchain check failed with $errors error(s)${NC}"
    echo
    echo "To set up the Emscripten toolchain:"
    echo "  1. Run: ./scripts/setup-emsdk.sh"
    echo "  2. Source the environment: source ~/.emsdk/emsdk_env.sh"
    echo "  3. Add to your shell profile for automatic activation"
    echo
    echo "Alternatively, use Docker: bun run build:docker"
    exit 1
else
    echo -e "${GREEN}All toolchain checks passed!${NC}"
    exit 0
fi
