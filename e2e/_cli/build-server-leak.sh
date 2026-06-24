#!/bin/bash
# E2E (CLI): `ekko build --client` must ERROR when a server-only ekko:* module leaks into the client bundle.
# Regression for the signoff: a page importing ekko:db/orm at module top shipped a non-hydrating app while the
# build only WARNed. Usage: bash build-server-leak.sh [path-to-ekko]
set -u
EKKO="${1:-$(cd "$(dirname "$0")/../.." && pwd)/_bin/ekko.exe}"
DIR="$(mktemp -d 2>/dev/null || echo "${TMPDIR:-/tmp}/leak-$$")"
mkdir -p "$DIR"; cd "$DIR" || exit 1
fail() { echo "FAIL: $1"; rm -rf "$DIR" 2>/dev/null; exit 1; }

"$EKKO" init rune leaktest -t asgard-minimal >/dev/null 2>&1 || fail "scaffold"
cd leaktest || fail "cd"
"$EKKO" add >/dev/null 2>&1 || fail "ekko add"

# A page that imports the server-only ORM at the TOP level (no /* START SSR */ markers) -> must fail the build.
cat > pages/leak.tsx <<'TSX'
import { connect } from "ekko:db/orm";
export function ssr() { connect(":memory:"); return { title: "leak" }; }
export default function Leak() { return <div>leak</div>; }
TSX

OUT="$("$EKKO" build --client 2>&1)"
if echo "$OUT" | grep -q "server-only EkkoJS module leaked"; then
  echo "  OK  build errors on a server-only client import"
else
  echo "  build output:"; echo "$OUT" | tail -6
  fail "build did NOT error on the ekko:db/orm leak"
fi

# Control: with the import wrapped in SSR markers, the build SUCCEEDS (the block is stripped client-side).
cat > pages/leak.tsx <<'TSX'
/* START SSR */
import { connect } from "ekko:db/orm";
export function ssr() { connect(":memory:"); return { title: "leak" }; }
/* END SSR */
export default function Leak() { return <div>leak</div>; }
TSX
if "$EKKO" build --client >/dev/null 2>&1; then
  echo "  OK  build succeeds when the server import is wrapped in /* START SSR */ markers"
else
  fail "build failed even with the import correctly wrapped in SSR markers"
fi

rm -rf "$DIR" 2>/dev/null
echo "ASSERTIONS 2 0"
echo "PASS: build-server-leak"
