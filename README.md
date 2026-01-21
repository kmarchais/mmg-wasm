# mmg-wasm

WebAssembly bindings for the [mmg](https://www.mmgtools.org/) mesh remeshing library.

## Status

🚧 **Work in progress** - Not yet ready for production use.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (package manager)
- [Emscripten SDK](https://emscripten.org/) (or use Docker)
- CMake 3.24+
- Ninja

### Build

```bash
# Install dependencies
bun install

# Option 1: Build with local Emscripten
bun run toolchain:setup          # Install emsdk (one-time)
source ~/.emsdk/emsdk_env.sh     # Activate emsdk
bun run build

# Option 2: Build with Docker (no local emsdk needed)
bun run build:docker
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions.

## Development

| Command | Description |
|---------|-------------|
| `bun run build` | Build Release version |
| `bun run build:debug` | Build Debug version |
| `bun run build:docker` | Build using Docker |
| `bun run clean` | Remove build artifacts |
| `bun run toolchain:check` | Verify toolchain installation |

## Related Projects

- [mmg](https://github.com/MmgTools/mmg) - The original C library
- [mmgpy](https://github.com/kmarchais/mmgpy) - Python bindings for mmg

## License

LGPL-3.0 (same as mmg)
