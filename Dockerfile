# Dockerfile for building mmg-wasm
# Provides a complete build environment with Emscripten, CMake, Ninja, and Bun

FROM emscripten/emsdk:4.0.10

# Install additional build tools
RUN apt-get update && apt-get install -y \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*

# Install CMake 3.31 (base image has 3.22 which is too old)
RUN curl -fsSL https://github.com/Kitware/CMake/releases/download/v3.31.6/cmake-3.31.6-linux-x86_64.tar.gz \
    | tar -xz -C /opt \
    && ln -sf /opt/cmake-3.31.6-linux-x86_64/bin/* /usr/local/bin/

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Set up working directory
WORKDIR /app

# Copy project files
COPY . .

# Install Node dependencies (for package.json scripts)
# Try frozen lockfile first, fall back with warning if it fails
RUN bun install --frozen-lockfile || \
    (echo "WARNING: bun.lockb mismatch, installing without frozen lockfile" && bun install)

# Default command: run the build
CMD ["bun", "run", "build"]
