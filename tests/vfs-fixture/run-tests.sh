#!/bin/bash
# Run VFS fixture tests — validates .ekl loading + module resolution from VFS
# Generates the .ekl fixture, then runs tests with --ekl flag

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EKKO="${1:-$REPO_ROOT/target/release/ekko}"
EKL_FILE="$SCRIPT_DIR/test-vfs-pkg.ekl"

echo "=== VFS Fixture Tests ==="

# Step 1: Generate the .ekl fixture
echo "Generating $EKL_FILE..."
cd "$REPO_ROOT"
cargo run -p ekko-vfs --example generate_fixture -- "$EKL_FILE" 2>&1 | tail -1
if [ ! -f "$EKL_FILE" ]; then
    echo "ERROR: Failed to generate .ekl fixture"
    exit 1
fi
echo ""

# Step 2: Run tests with --ekl flag
cd "$SCRIPT_DIR"
PASS=0
FAIL=0

for test_file in *.test.ts; do
    [ ! -f "$test_file" ] && continue
    echo "── $test_file ──"
    if $EKKO test "$test_file" --ekl "$EKL_FILE" 2>&1; then
        PASS=$((PASS + 1))
    else
        FAIL=$((FAIL + 1))
        echo "  FAILED!"
    fi
    echo ""
done

echo "=== $PASS suites passed, $FAIL failed ==="
[ $FAIL -gt 0 ] && exit 1
