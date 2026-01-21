# Fetch mmg library from GitHub using FetchContent
include(FetchContent)

set(MMG_VERSION "v5.8.0")
set(MMG_GIT_REPOSITORY "https://github.com/MmgTools/mmg.git")

message(STATUS "Fetching mmg ${MMG_VERSION} from ${MMG_GIT_REPOSITORY}")

FetchContent_Declare(
    mmg
    GIT_REPOSITORY ${MMG_GIT_REPOSITORY}
    GIT_TAG        ${MMG_VERSION}
    GIT_SHALLOW    TRUE
    GIT_PROGRESS   TRUE
)

# Configure mmg build options before making it available
# Disable optional dependencies that aren't available/needed for WASM
set(USE_VTK OFF CACHE BOOL "" FORCE)
set(USE_SCOTCH OFF CACHE BOOL "" FORCE)
set(USE_ELAS OFF CACHE BOOL "" FORCE)

# Emscripten doesn't have a separate libm - math functions are in libc
# Set M_LIB to empty to prevent "NOTFOUND" errors
set(M_LIB "" CACHE STRING "" FORCE)

# Build static library only (no shared library for WASM)
set(LIBMMG_STATIC ON CACHE BOOL "" FORCE)
set(LIBMMG_SHARED OFF CACHE BOOL "" FORCE)
set(LIBMMG2D_STATIC ON CACHE BOOL "" FORCE)
set(LIBMMG2D_SHARED OFF CACHE BOOL "" FORCE)
set(LIBMMG3D_STATIC ON CACHE BOOL "" FORCE)
set(LIBMMG3D_SHARED OFF CACHE BOOL "" FORCE)
set(LIBMMGS_STATIC ON CACHE BOOL "" FORCE)
set(LIBMMGS_SHARED OFF CACHE BOOL "" FORCE)

# Disable building executables (we only need the library)
set(BUILD_TESTING OFF CACHE BOOL "" FORCE)
set(MMG_BUILD_TESTS OFF CACHE BOOL "" FORCE)

# Disable Fortran header generation - genheader.js can't run Perl via system()
# in WASM environment, and we don't need Fortran bindings anyway
set(CMAKE_DISABLE_FIND_PACKAGE_Perl TRUE)

# Fetch and make available
FetchContent_MakeAvailable(mmg)

message(STATUS "mmg ${MMG_VERSION} configured")
