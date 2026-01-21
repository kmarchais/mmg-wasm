#!/usr/bin/env bash
# Install Emscripten SDK to ~/.emsdk

set -e

EMSDK_VERSION="4.0.10"
EMSDK_DIR="${EMSDK_DIR:-$HOME/.emsdk}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Installing Emscripten SDK $EMSDK_VERSION to $EMSDK_DIR"
echo

# Check for git
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is required but not installed${NC}"
    exit 1
fi

# Clone or update emsdk
if [ -d "$EMSDK_DIR" ]; then
    echo "Updating existing emsdk installation..."
    cd "$EMSDK_DIR"
    git pull
else
    echo "Cloning emsdk repository..."
    git clone https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
    cd "$EMSDK_DIR"
fi

echo
echo "Installing emsdk $EMSDK_VERSION..."
./emsdk install "$EMSDK_VERSION"

echo
echo "Activating emsdk $EMSDK_VERSION..."
./emsdk activate "$EMSDK_VERSION"

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Emscripten SDK installed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "To activate in your current shell, run:"
echo -e "  ${YELLOW}source $EMSDK_DIR/emsdk_env.sh${NC}"
echo
echo "To auto-activate in new shells, add this to your ~/.bashrc or ~/.zshrc:"
echo -e "  ${YELLOW}source $EMSDK_DIR/emsdk_env.sh${NC}"
echo
