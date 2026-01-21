# Contributing to mmg-wasm

## Prerequisites

- **CMake** 3.29 or higher
- **Ninja** build system
- **Emscripten SDK** 4.0.10 or higher
- **Bun** (for package management and scripts)

## Development Setup

There are three ways to set up the development environment:

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/kmarchais/mmg-wasm.git
cd mmg-wasm

# Install Node dependencies
bun install

# Install Emscripten SDK
bun run toolchain:setup

# Activate Emscripten in your shell
source ~/.emsdk/emsdk_env.sh

# Build
bun run build
```

To auto-activate Emscripten in new shells, add to your `~/.bashrc` or `~/.zshrc`:

```bash
source ~/.emsdk/emsdk_env.sh
```

### Option 2: Manual Emscripten Setup

If you prefer to manage Emscripten yourself:

```bash
# Install emsdk manually
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 4.0.10
./emsdk activate 4.0.10
source ./emsdk_env.sh

# Then build mmg-wasm
cd /path/to/mmg-wasm
bun install
bun run build
```

### Option 3: Docker (No Local Installation)

For a completely isolated build environment:

```bash
bun install
bun run build:docker
```

The build output will be in the `build/` directory.

**Note for Apple Silicon users:** Docker builds use x86_64 emulation and may be significantly slower than native builds.

## Build Commands

| Command | Description |
|---------|-------------|
| `bun run build` | Build Release version |
| `bun run build:debug` | Build Debug version with extra checks |
| `bun run build:docker` | Build using Docker |
| `bun run clean` | Remove build artifacts |
| `bun run toolchain:check` | Verify toolchain is installed correctly |
| `bun run toolchain:setup` | Install Emscripten SDK |

## Project Structure

```
mmg-wasm/
├── cmake/
│   ├── EmscriptenConfig.cmake   # Emscripten link flags and helpers
│   └── FetchMMG.cmake           # Downloads mmg library
├── scripts/
│   ├── build.sh                 # Main build script
│   ├── check-toolchain.sh       # Verify toolchain installation
│   └── setup-emsdk.sh           # Install Emscripten SDK
├── src/                         # TypeScript/JavaScript bindings
├── build/                       # CMake build directory (generated)
├── CMakeLists.txt               # Main CMake configuration
├── Dockerfile                   # Docker build environment
└── package.json                 # Node/Bun package configuration
```

## Troubleshooting

### "emcc not found"

The Emscripten SDK is not activated. Run:

```bash
source ~/.emsdk/emsdk_env.sh
```

Or use Docker: `bun run build:docker`

### CMake version too old

CMake 3.29+ is required for FetchContent improvements. Install from:
- https://cmake.org/download/
- Or via package manager: `brew install cmake` (macOS) / `snap install cmake` (Linux)

### Build fails with memory errors

The build requires significant memory. If using Docker, ensure Docker has at least 4GB RAM allocated.

### Permission denied on scripts

Make the scripts executable:

```bash
chmod +x scripts/*.sh
```

## Code Style

- TypeScript: Use Biome for linting and formatting (`bun run check`)
- C/C++: Follow mmg's existing code style
- Shell scripts: Use shellcheck for linting

## Testing

```bash
bun test
```

Tests are located in the `test/` directory and use Bun's built-in test runner.
