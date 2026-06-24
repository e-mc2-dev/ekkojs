#!/bin/bash
# Run workspace fixture tests — validates workspace member resolution
# Must be run from within the workspace fixture directory

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

EKKO="${1:-../../target/release/ekko}"

echo "=== Workspace Fixture Tests ==="
echo "CWD: $(pwd)"
echo "Ekko: $EKKO"
echo ""

PASS=0
FAIL=0

for test_file in tests/*.test.ts; do
    echo "── $(basename $test_file) ──"
    if $EKKO test "$test_file" 2>&1; then
        PASS=$((PASS + 1))
    else
        FAIL=$((FAIL + 1))
        echo "  FAILED!"
    fi
    echo ""
done

echo "=== $PASS suites passed, $FAIL failed ==="
if [ $FAIL -gt 0 ]; then
    exit 1
fi
