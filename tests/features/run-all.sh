#!/bin/bash
EKKO="${1:-ekko}"
DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0; FAIL=0
echo "=== EkkoJS Feature Tests ==="
echo "Binary: $EKKO"
echo "Version: $($EKKO --version 2>&1)"
echo ""
for td in "$DIR"/m*; do
  [ ! -d "$td" ] && continue
  name=$(basename "$td")
  tf=""; for f in "$td"/test.js "$td"/test.ts; do [ -f "$f" ] && tf="$f" && break; done
  [ -z "$tf" ] && continue
  echo "── $name ──"
  # A test dir may declare the capabilities it needs in an `allow` file (comma-separated, e.g.
  # "net,env"). Dirs with no `allow` file run default-deny so permission gating stays tested.
  allow=""
  [ -f "$td/allow" ] && allow="--allow=$(tr -d '[:space:]' < "$td/allow")"
  [ -n "$allow" ] && echo "  (perms: $allow)"
  if $EKKO run $allow "$tf" 2>&1; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); echo "  *** FAILED ***"; fi
  echo ""
done
echo "=== $PASS suites passed, $FAIL failed ==="
[ "$FAIL" -gt 0 ] && exit 1
exit 0
