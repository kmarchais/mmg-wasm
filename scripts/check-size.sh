#!/bin/bash
# Check WASM bundle size against thresholds
#
# Usage: ./scripts/check-size.sh [--ci]
#   --ci: Enable strict mode for CI (exit 1 on threshold exceeded)

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Size thresholds (in bytes)
WASM_MAX_GZIP=3145728     # 3 MB gzipped
JS_RUNTIME_MAX=100000     # 100 KB (uncompressed)
TS_WRAPPER_MAX=250000     # 250 KB (uncompressed)

# Parse arguments
CI_MODE=false
if [ "$1" = "--ci" ]; then
    CI_MODE=true
fi

# Check if build artifacts exist
WASM_FILE="build/dist/mmg.wasm"
JS_FILE="build/dist/mmg.js"
TS_FILE="dist/index.js"

if [ ! -f "$WASM_FILE" ]; then
    echo -e "${RED}Error: $WASM_FILE not found. Run 'bun run build' first.${NC}"
    exit 1
fi

# Calculate sizes
WASM_SIZE=$(stat -c%s "$WASM_FILE" 2>/dev/null || stat -f%z "$WASM_FILE")
WASM_GZIP=$(gzip -c "$WASM_FILE" | wc -c)
JS_SIZE=0
TS_SIZE=0

if [ -f "$JS_FILE" ]; then
    JS_SIZE=$(stat -c%s "$JS_FILE" 2>/dev/null || stat -f%z "$JS_FILE")
fi

if [ -f "$TS_FILE" ]; then
    TS_SIZE=$(stat -c%s "$TS_FILE" 2>/dev/null || stat -f%z "$TS_FILE")
fi

# Convert to human readable
format_size() {
    local size=$1
    if [ "$size" -ge 1048576 ]; then
        printf "%.2f MB" "$(echo "scale=2; $size / 1048576" | bc)"
    elif [ "$size" -ge 1024 ]; then
        printf "%.2f KB" "$(echo "scale=2; $size / 1024" | bc)"
    else
        printf "%d bytes" "$size"
    fi
}

# Print report
echo "═══════════════════════════════════════════════════════════════"
echo "                    mmg-wasm Bundle Size Report                 "
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "WASM Binary ($WASM_FILE):"
echo "  Raw size:        $(format_size $WASM_SIZE)"
echo "  Gzipped size:    $(format_size $WASM_GZIP)"
echo "  Budget:          $(format_size $WASM_MAX_GZIP) gzipped"
echo ""

if [ "$JS_SIZE" -gt 0 ]; then
    echo "JS Runtime ($JS_FILE):"
    echo "  Size:            $(format_size $JS_SIZE)"
    echo "  Budget:          $(format_size $JS_RUNTIME_MAX)"
    echo ""
fi

if [ "$TS_SIZE" -gt 0 ]; then
    echo "TS Wrapper ($TS_FILE):"
    echo "  Size:            $(format_size $TS_SIZE)"
    echo "  Budget:          $(format_size $TS_WRAPPER_MAX)"
    echo ""
fi

TOTAL_GZIP=$WASM_GZIP
if [ "$JS_SIZE" -gt 0 ]; then
    JS_GZIP=$(gzip -c "$JS_FILE" | wc -c)
    TOTAL_GZIP=$((TOTAL_GZIP + JS_GZIP))
fi
if [ "$TS_SIZE" -gt 0 ]; then
    TS_GZIP=$(gzip -c "$TS_FILE" | wc -c)
    TOTAL_GZIP=$((TOTAL_GZIP + TS_GZIP))
fi

echo "Total (gzipped):   $(format_size $TOTAL_GZIP)"
echo ""
echo "═══════════════════════════════════════════════════════════════"

# Check thresholds
FAILED=false

if [ "$WASM_GZIP" -gt "$WASM_MAX_GZIP" ]; then
    echo -e "${RED}✗ WASM exceeds budget by $(format_size $((WASM_GZIP - WASM_MAX_GZIP)))${NC}"
    FAILED=true
else
    echo -e "${GREEN}✓ WASM within budget ($(( (WASM_MAX_GZIP - WASM_GZIP) * 100 / WASM_MAX_GZIP ))% headroom)${NC}"
fi

if [ "$JS_SIZE" -gt "$JS_RUNTIME_MAX" ]; then
    echo -e "${RED}✗ JS Runtime exceeds budget${NC}"
    FAILED=true
elif [ "$JS_SIZE" -gt 0 ]; then
    echo -e "${GREEN}✓ JS Runtime within budget${NC}"
fi

if [ "$TS_SIZE" -gt "$TS_WRAPPER_MAX" ]; then
    echo -e "${RED}✗ TS Wrapper exceeds budget${NC}"
    FAILED=true
elif [ "$TS_SIZE" -gt 0 ]; then
    echo -e "${GREEN}✓ TS Wrapper within budget${NC}"
fi

echo ""

# Output for CI (machine-readable)
if [ "$CI_MODE" = true ]; then
    if [ -n "$GITHUB_OUTPUT" ]; then
        echo "wasm_size=$WASM_SIZE" >> "$GITHUB_OUTPUT"
        echo "wasm_gzip=$WASM_GZIP" >> "$GITHUB_OUTPUT"
        echo "total_gzip=$TOTAL_GZIP" >> "$GITHUB_OUTPUT"
    fi

    if [ "$FAILED" = true ]; then
        echo -e "${RED}Bundle size check FAILED${NC}"
        exit 1
    fi
fi

if [ "$FAILED" = true ]; then
    exit 1
fi

echo -e "${GREEN}All size checks passed!${NC}"
