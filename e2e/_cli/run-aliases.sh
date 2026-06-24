#!/bin/bash
# E2E (CLI): `ekko x <alias>` / `ekko run <alias>` run-alias resolution.
#   - workspace-local aliases (ekko.json "x") resolve, and override global on a name clash
#   - workspace file-aliases anchor to the project, so they run from any subfolder (walk-up)
#   - global aliases (~/.ekko/config.json "x") resolve; `ekko alias set/list/rm` manage them
#   - explicit files and unknown names are NEVER rewritten (resolve as usual); alias cycles error
# Self-counts: prints one `ASSERTIONS <pass> <fail>` line. Usage: bash run-aliases.sh [path-to-ekko]
set -u
EKKO="${1:-$(cd "$(dirname "$0")/../.." && pwd)/_bin/ekko.exe}"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ok  $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL $1"; }
has()  { echo "$2" | grep -q "$1"; }

ROOT="$(mktemp -d 2>/dev/null || echo "${TMPDIR:-/tmp}/alias-$$")"
# Isolate the GLOBAL config + store into a throwaway HOME so `ekko alias set --global` never touches the real
# ~/.ekko/config.json. user_config_path() reads USERPROFILE on Windows, HOME elsewhere — set both.
export HOME="$ROOT/home"; export USERPROFILE="$ROOT/home"
mkdir -p "$HOME/.ekko"
PROJ="$ROOT/proj"; mkdir -p "$PROJ/sub/deep"
cleanup() { rm -rf "$ROOT" 2>/dev/null; }
trap cleanup EXIT

# Target scripts print a unique marker so we can prove WHICH one ran.
printf 'console.log("RAN_WS");\n'       > "$PROJ/ws.ts"
printf 'console.log("RAN_GLOBAL");\n'   > "$ROOT/glob.ts"
printf 'console.log("RAN_EXPLICIT");\n' > "$PROJ/explicit.ts"

# Workspace aliases: `go` → relative file (anchored to the project); `both` clashes with a global alias.
cat > "$PROJ/ekko.json" <<JSON
{ "name": "aliastest", "version": "1.0.0", "type": "run", "entry": "ws.ts",
  "x": { "go": "./ws.ts", "both": "./ws.ts", "cyc": "cyc2", "cyc2": "cyc", "bogus": "@nope/nope-pkg" } }
JSON

cd "$PROJ" || { echo "ASSERTIONS 0 1"; exit 1; }

# 1. workspace alias → its relative target (from the project root)
OUT="$("$EKKO" x go 2>&1)";        has "RAN_WS" "$OUT" && ok "workspace alias runs its target" || bad "workspace alias ('go'): $OUT"

# 2. walk-up + anchor: same alias from a deep subfolder still runs the project file
OUT="$(cd "$PROJ/sub/deep" && "$EKKO" x go 2>&1)"; has "RAN_WS" "$OUT" && ok "workspace alias resolves from a subfolder (walk-up + anchor)" || bad "subfolder walk-up: $OUT"

# 3. global alias via the management command, then run it (absolute target → cwd-independent)
"$EKKO" alias set gonly "$ROOT/glob.ts" >/dev/null 2>&1
OUT="$("$EKKO" x gonly 2>&1)";     has "RAN_GLOBAL" "$OUT" && ok "global alias (set then run)" || bad "global alias ('gonly'): $OUT"

# 4. workspace WINS over global on a name clash (`both` exists in both; set global `both` to the GLOBAL target)
"$EKKO" alias set both "$ROOT/glob.ts" >/dev/null 2>&1
OUT="$("$EKKO" x both 2>&1)";      has "RAN_WS" "$OUT" && ok "workspace overrides global on a clash" || bad "precedence ('both' should run WS): $OUT"

# 5. `ekko alias list` shows both maps
OUT="$("$EKKO" alias list 2>&1)";  { has "go ->" "$OUT" && has "gonly ->" "$OUT"; } && ok "alias list shows workspace + global" || bad "alias list: $OUT"

# 6. `ekko alias rm` removes the global one
"$EKKO" alias rm gonly >/dev/null 2>&1
OUT="$("$EKKO" x gonly 2>&1)";     ! has "RAN_GLOBAL" "$OUT" && ok "alias rm removes the global alias" || bad "rm did not remove 'gonly': $OUT"

# 7. an EXPLICIT file is never intercepted by an alias (even though aliases exist)
OUT="$("$EKKO" x ./explicit.ts 2>&1)"; has "RAN_EXPLICIT" "$OUT" && ok "explicit file is not intercepted" || bad "explicit file: $OUT"

# 8. an unknown plain name is NOT rewritten → normal 'not found' (no alias, falls through)
OUT="$("$EKKO" x definitelynotanalias 2>&1)"; { ! has "RAN_" "$OUT" && has "not found" "$OUT"; } && ok "unknown name falls through to normal resolution" || bad "unknown name: $OUT"

# 9. an alias cycle errors clearly (does not loop)
OUT="$("$EKKO" x cyc 2>&1)";       has "cycle" "$OUT" && ok "alias cycle is detected and errors" || bad "cycle not caught: $OUT"

# 10. an alias to a non-existent target blames the ALIAS (name + target), not a mystery path
OUT="$("$EKKO" x bogus 2>&1)";     { has "alias 'bogus'" "$OUT" && has "@nope/nope-pkg" "$OUT"; } && ok "unresolvable alias error names the alias + target" || bad "alias error not attributed: $OUT"

echo "ASSERTIONS $PASS $FAIL"
