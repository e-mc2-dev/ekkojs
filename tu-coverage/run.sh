#!/bin/bash
EKKO="${1:-ekko}"
DIR="$(cd "$(dirname "$0")" && pwd)"
TIMEOUT=30
TIMEOUT_CMD=""
if command -v timeout >/dev/null 2>&1; then
  TIMEOUT_CMD="timeout $TIMEOUT"
elif command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT_CMD="gtimeout $TIMEOUT"
fi
echo "=== EkkoJS Unit Test Suite ==="
echo "Binary: $EKKO"
echo "Version: $($EKKO --version 2>&1)"
echo ""

PASS=0; FAIL=0

run_section() {
  local label="$1"; shift
  echo "━━━━ $label ━━━━"
  for tf in "$@"; do
    [ ! -f "$tf" ] && continue
    name=$(echo "$tf" | sed "s|$DIR/||")
    if $TIMEOUT_CMD $EKKO test "$tf" 2>&1; then
      PASS=$((PASS+1))
    else
      ec=$?
      if [ "$ec" -eq 124 ]; then
        echo "  *** TIMEOUT (${TIMEOUT}s): $name ***"
      else
        echo "  *** FAILED: $name ***"
      fi
      FAIL=$((FAIL+1))
    fi
  done
  echo ""
}

run_section "Core: Module Resolution" "$DIR"/core/module-resolution/*.test.ts
run_section "Core: Spawn" "$DIR"/core/spawn/*.test.ts
run_section "Core: Parallel" "$DIR"/core/parallel/*.test.ts
run_section "Core: Channels" "$DIR"/core/channels/*.test.ts
run_section "Core: Select" "$DIR"/core/select/*.test.ts
run_section "Core: Timers" "$DIR"/core/timers/*.test.ts
run_section "Core: Console" "$DIR"/core/console/*.test.ts
run_section "Core: Performance" "$DIR"/core/performance/*.test.ts
run_section "Core: TypeScript" "$DIR"/core/typescript/*.test.ts
run_section "Core: Globals" "$DIR"/core/globals/*.test.ts
run_section "Core: JSX" "$DIR"/core/jsx/*.test.ts
run_section "Core: Security" "$DIR"/core/security/*.test.ts

run_section "Std: fs" "$DIR"/std/fs/*.test.ts
run_section "Std: path" "$DIR"/std/path/*.test.ts
run_section "Std: encoding" "$DIR"/std/encoding/*.test.ts
run_section "Std: compress" "$DIR"/std/compress/*.test.ts
run_section "Std: json" "$DIR"/std/json/*.test.ts
run_section "Std: regex" "$DIR"/std/regex/*.test.ts
run_section "Std: crypto" "$DIR"/std/crypto/*.test.ts
run_section "Std: datetime" "$DIR"/std/datetime/*.test.ts
run_section "Std: db" "$DIR"/std/db/*.test.ts
run_section "Std: process" "$DIR"/std/process/*.test.ts
run_section "Std: net" "$DIR"/std/net/*.test.ts
run_section "Std: web" "$DIR"/std/web/*.test.ts
run_section "Std: assert" "$DIR"/std/assert/*.test.ts
run_section "Std: log" "$DIR"/std/log/*.test.ts
run_section "Std: validate" "$DIR"/std/validate/*.test.ts
run_section "Std: orm" "$DIR"/std/orm/*.test.ts
run_section "Std: auth" "$DIR"/std/auth/*.test.ts
run_section "Std: queue" "$DIR"/std/queue/*.test.ts
run_section "Std: cron" "$DIR"/std/cron/*.test.ts
run_section "Std: realtime" "$DIR"/std/realtime/*.test.ts
run_section "Std: cli" "$DIR"/std/cli/*.test.ts
run_section "Std: ssr" "$DIR"/std/ssr/*.test.ts

# ── Workspace tests (run from within workspace fixture) ──
echo "━━━━ Core: Workspace ━━━━"
WS_DIR="$DIR/../tests/workspace-fixture"
if [ -d "$WS_DIR" ]; then
  ORIG_DIR="$(pwd)"
  cd "$WS_DIR"
  for tf in tests/*.test.ts; do
    [ ! -f "$tf" ] && continue
    if $TIMEOUT_CMD $EKKO test "$tf" 2>&1; then
      PASS=$((PASS+1))
    else
      ec=$?
      if [ "$ec" -eq 124 ]; then
        echo "  *** TIMEOUT (${TIMEOUT}s): $tf ***"
      fi
      FAIL=$((FAIL+1))
    fi
  done
  cd "$ORIG_DIR"
fi

# ── VFS tests (load .ekl fixture via --ekl flag) ──
echo "━━━━ Core: VFS ━━━━"
VFS_DIR="$DIR/../tests/vfs-fixture"
VFS_EKL="$VFS_DIR/test-vfs-pkg.ekl"
if [ -d "$VFS_DIR" ] && [ -f "$VFS_EKL" ]; then
  for tf in "$VFS_DIR"/*.test.ts; do
    [ ! -f "$tf" ] && continue
    if $TIMEOUT_CMD $EKKO test "$tf" --ekl "$VFS_EKL" 2>&1; then
      PASS=$((PASS+1))
    else
      ec=$?
      if [ "$ec" -eq 124 ]; then
        echo "  *** TIMEOUT (${TIMEOUT}s): $tf ***"
      fi
      FAIL=$((FAIL+1))
    fi
  done
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "=== $PASS suites passed, $FAIL failed ==="
[ "$FAIL" -gt 0 ] && exit 1
exit 0
