# Dockerfile for building mmg-wasm
# Provides a complete build environment with Emscripten, CMake, Ninja, and Bun

FROM emscripten/emsdk:4.0.10

# Install additional build tools
RUN apt-get update && apt-get install -y \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Set up working directory
WORKDIR /app

# Copy project files
COPY . .

# Install Node dependencies (for package.json scripts)
RUN bun install --frozen-lockfile || bun install

# Default command: run the build
CMD ["bun", "run", "build"]
