#!/bin/bash
# EkkoJS E2E campaign runner.
#
# Walks every e2e/**/*.e2e.ts, runs each with the EkkoJS binary, declaring the
# capabilities listed in an optional per-file sidecar `<file>.allow` (comma- or
# newline-separated, e.g. "fs" or "net,env"). Files with no sidecar run
# default-deny so permission gating stays exercised.
#
# Each test file prints a self-counted summary line:  `ASSERTIONS <pass> <fail>`
# This runner sums those across all files and fails if ANY file:
#   - exits non-zero, OR
#   - reports failed assertions, OR
#   - prints no ASSERTIONS line (crash / no summary).
#
# Usage: bash e2e/run-all.sh [path-to-ekko]   (default: `ekko` on PATH)

set -u
EKKO="${1:-ekko}"
DIR="$(cd "$(dirname "$0")" && pwd)"
# Run from the repo root so CWD-relative scopes (e.g. --allow=fs:e2e/_secfix/sandbox/**)
# and any CWD-relative fixtures resolve identically on every platform.
cd "$(dirname "$DIR")" || exit 1

echo "=== EkkoJS E2E Campaign ==="
echo "Binary:  $EKKO"
echo "Version: $($EKKO --version 2>&1)"
echo ""

TOTAL_PASS=0
TOTAL_FAIL=0
FILES_OK=0
FILES_BAD=0

# Deterministic order; portable (no readarray dependency).
FILES="$(find "$DIR" -type f -name '*.e2e.ts' | sort)"

for tf in $FILES; do
  rel="${tf#"$DIR"/}"
  allow=""
  if [ -f "$tf.allow" ]; then
    caps="$(tr '\n' ',' < "$tf.allow" | tr -d '[:space:]' | sed 's/,$//; s/^,//')"
    [ -n "$caps" ] && allow="--allow=$caps"
  fi

  out="$($EKKO run $allow "$tf" 2>&1)"
  code=$?

  # Parse the LAST "ASSERTIONS <pass> <fail>" line (a file prints exactly one).
  line="$(printf '%s\n' "$out" | grep -E '^ASSERTIONS [0-9]+ [0-9]+$' | tail -1)"
  if [ -z "$line" ]; then
    FILES_BAD=$((FILES_BAD + 1))
    echo "✗ $rel — NO ASSERTIONS LINE (exit $code)"
    printf '%s\n' "$out" | tail -15 | sed 's/^/    /'
    continue
  fi

  p="$(echo "$line" | awk '{print $2}')"
  f="$(echo "$line" | awk '{print $3}')"
  TOTAL_PASS=$((TOTAL_PASS + p))
  TOTAL_FAIL=$((TOTAL_FAIL + f))

  if [ "$f" -eq 0 ] && [ "$code" -eq 0 ]; then
    FILES_OK=$((FILES_OK + 1))
    echo "✓ $rel — $p assertions"
  else
    FILES_BAD=$((FILES_BAD + 1))
    echo "✗ $rel — $p passed, $f FAILED (exit $code)"
    # Dump the failing file's full (colored) output indented — more useful than
    # grepping individual lines, and robust to the harness's ANSI formatting.
    printf '%s\n' "$out" | sed 's/^/    /'
  fi
done

echo ""
echo "=== TOTAL: $TOTAL_PASS assertions passed, $TOTAL_FAIL failed | $FILES_OK files ok, $FILES_BAD bad ==="
[ "$FILES_BAD" -gt 0 ] && exit 1
[ "$TOTAL_FAIL" -gt 0 ] && exit 1
exit 0
