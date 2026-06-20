#!/bin/bash
# Reproducible end-to-end matrix for the `ekko run`/`ekko add` dependency flow: store-reconcile on run,
# version-spec semantics, and messaging. Complements the deterministic unit tests in
# crates/ekko-core/src/packages/store.rs (those run in `cargo test` with no network); THIS script exercises
# the full CLI against a REAL registry, so it needs registry access and a published `@ekko/react` (v19).
#
# Usage:  bash e2e/_cli/run-add-reconcile.sh [path-to-ekko]   (default: `ekko` on PATH)
# Exit:   0 = all scenarios pass, 1 = any failure. Prints PASS/FAIL per scenario.
set -u
EKKO="${1:-ekko}"
TMP="$(mktemp -d)"; ST="${EKKO_HOME:-$HOME}/.ekko/store/@ekko"
PASS=0; FAIL=0
ok()   { echo "  PASS: $1"; PASS=$((PASS+1)); }
bad()  { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }
has()  { echo "$1" | grep -qiE "$2"; }            # output, pattern
trap 'rm -rf "$TMP"' EXIT

echo "=== run/add reconcile matrix ==="; echo "Binary: $EKKO"; "$EKKO" --version 2>&1 | tail -1

fresh() { # $1=dir $2=spec  -> scaffold, then overwrite ekko.json with the spec (portable, no sed -i)
  rm -rf "$TMP/$1"
  "$EKKO" init rune -t showcase --path "$TMP/$1" --name "$1" </dev/null >/dev/null 2>&1
  cat > "$TMP/$1/ekko.json" <<JSON
{
  "name": "$1", "version": "1.0.0", "type": "run", "entry": "server.tsx",
  "imports": { "react": "@ekko/react", "react-dom": "@ekko/react-dom", "react-dom/client": "@ekko/react-dom/client", "react-dom/server": "@ekko/react-dom/server", "react/jsx-runtime": "@ekko/react/jsx-runtime" },
  "ship": { "@ekko/react": "$2", "@ekko/react-dom": "$2" },
  "permissions": { "net": true, "fs": true },
  "package": { "include": ["pages/**","atoms/**","styles/**","static/**","content/**",".ekko/build/**"] }
}
JSON
  printf 'import { useState } from "@ekko/react";\nconsole.log("PROBE", typeof useState);\n' > "$TMP/$1/probe.ts"
  rm -f "$TMP/$1/ekko.lock"
}
seed_store() { if [ ! -d "$ST/react" ]; then fresh _seed "^19.0.0"; ( cd "$TMP/_seed" && "$EKKO" add >/dev/null 2>&1 ); fi; }
clean_store() { rm -rf "$ST/react" "$ST/react-dom"; }
probe() { ( cd "$TMP/$1" && "$EKKO" run probe.ts 2>&1 ); }

# 1: range spec, store present, no lock -> reconcile fills lock -> resolves
seed_store; fresh t1 "^19.0.0"; O="$(probe t1)"
{ has "$O" 'PROBE function' && [ -f "$TMP/t1/ekko.lock" ]; } && ok "range + store -> reconcile resolves + lock written" || bad "range + store"

# 2: range spec, store absent -> clear 'ekko add' error
clean_store; fresh t2 "^19.0.0"; O="$(probe t2)"
{ has "$O" 'is not installed in this project' && has "$O" 'ekko add'; } && ok "missing -> clear run-ekko-add error" || bad "missing-error"

# 3: exact existing version, store present, no lock -> resolves
seed_store; fresh t3 "19.0.0"; has "$(probe t3)" 'PROBE function' && ok "exact-present -> resolves" || bad "exact-present"

# 4: exact MISSING version, store present -> not auto-resolved -> error
seed_store; fresh t4 "0.1.0"; has "$(probe t4)" 'is not installed in this project' && ok "exact-missing -> not auto-resolved" || bad "exact-missing"

# 5: ekko add exact non-published version -> clear 'not a published version' (NOT 'empty .ekl')
fresh t5 "0.1.0"; O="$( cd "$TMP/t5" && "$EKKO" add 2>&1 )"
{ has "$O" 'is not a published version' && ! has "$O" 'empty .ekl'; } && ok "add exact-missing -> clear message" || bad "add-message"

# 6: ekko add '*' -> installs latest (19)
clean_store; fresh t6 "*"; has "$( cd "$TMP/t6" && "$EKKO" add 2>&1 )" '@ekko/react@19|Installed [0-9]' && ok "add * -> latest installed" || bad "add-star"

# 7: build --client, range, store present, no lock -> reconcile -> builds
seed_store; fresh t7 "^19.0.0"; has "$( cd "$TMP/t7" && "$EKKO" build --client 2>&1 )" 'chunks to' && ok "build reconcile -> builds" || bad "build-reconcile"

# 8: regression - lock present + store present -> no-op -> resolves
seed_store; fresh t8 "^19.0.0"; ( cd "$TMP/t8" && "$EKKO" add >/dev/null 2>&1 ); has "$(probe t8)" 'PROBE function' && ok "locked project unaffected" || bad "regression"

echo ""; echo "=== reconcile matrix: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
