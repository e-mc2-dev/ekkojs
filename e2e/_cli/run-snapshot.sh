#!/bin/bash
# E2E (CLI): `ekko run --snapshot` one-shot headless TUI render.
#   - an explicit TUI source file renders its first frame to stdout and exits 0 (routed to the TUI host)
#   - the no-file form (`ekko run --snapshot`) renders the project entry the same way
#   - COLUMNS/LINES size the headless surface deterministically
#   - a file that never calls render() produces the "no frame" diagnostic and exits non-zero (no hang)
#   - piped output is plain (no ANSI escapes) so it is safe to capture/diff
# Self-counts: prints one `ASSERTIONS <pass> <fail>` line. Usage: bash run-snapshot.sh [path-to-ekko]
set -u
EKKO="${1:-$(cd "$(dirname "$0")/../.." && pwd)/_bin/ekko.exe}"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ok  $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL $1"; }
has()  { echo "$2" | grep -q "$1"; }

ROOT="$(mktemp -d 2>/dev/null || echo "${TMPDIR:-/tmp}/snap-$$")"
PROJ="$ROOT/proj"; mkdir -p "$PROJ"
cleanup() { rm -rf "$ROOT" 2>/dev/null; }
trap cleanup EXIT

cat > "$PROJ/ekko.json" <<JSON
{ "name": "snaptest", "version": "1.0.0", "type": "tui", "entry": "app.tsx" }
JSON

cat > "$PROJ/app.tsx" <<'TSX'
import { render, Box, Text } from "ekko:app/tui";
function App() {
  // width 50 is wider than the NARROW test terminal (34) so COLUMNS becomes the clipping boundary,
  // and still fits the WIDE one (60) — the rendered border length then tracks the surface size.
  return (
    <Box border width={50} height={3}>
      <Text bold color="cyan">Hello Snapshot</Text>
    </Box>
  );
}
render(<App />);
TSX

# A plain script that never calls render() — must not be mistaken for a renderable TUI app.
cat > "$PROJ/plain.tsx" <<'TSX'
console.log("not a tui");
TSX

cd "$PROJ" || { echo "ASSERTIONS 0 1"; exit 1; }
export COLUMNS=40 LINES=8 NO_COLOR=1

# 1. explicit file → first frame rendered (border + text), process exits 0
OUT="$(COLUMNS=40 LINES=8 NO_COLOR=1 "$EKKO" run --snapshot app.tsx 2>/dev/null)"; EXIT=$?
{ has "Hello Snapshot" "$OUT" && [ "$EXIT" -eq 0 ]; } && ok "explicit file renders a frame and exits 0" || bad "explicit file (exit=$EXIT): $OUT"

# 2. the rendered frame includes the box border (the Box border=true draws corners/edges)
{ has "┌" "$OUT" && has "│" "$OUT" && has "└" "$OUT"; } && ok "border is drawn in the snapshot" || bad "no border in frame: $OUT"

# 3. no-file form runs the project entry the same way
OUT2="$(COLUMNS=40 LINES=8 NO_COLOR=1 "$EKKO" run --snapshot 2>/dev/null)"; EXIT2=$?
{ has "Hello Snapshot" "$OUT2" && [ "$EXIT2" -eq 0 ]; } && ok "no-file form renders the project entry" || bad "no-file form (exit=$EXIT2): $OUT2"

# 4. COLUMNS sizes the surface — a 50-wide box shows in full at COLUMNS=60 but is clipped at COLUMNS=34
WIDE="$(COLUMNS=60 LINES=8 NO_COLOR=1 "$EKKO" run --snapshot app.tsx 2>/dev/null)"
NARROW="$(COLUMNS=34 LINES=8 NO_COLOR=1 "$EKKO" run --snapshot app.tsx 2>/dev/null)"
WLEN=$(echo "$WIDE"  | grep '─' | head -1 | wc -c)
NLEN=$(echo "$NARROW" | grep '─' | head -1 | wc -c)
[ "$WLEN" -gt "$NLEN" ] && ok "COLUMNS sizes the headless surface (wide $WLEN > narrow $NLEN)" || bad "COLUMNS not applied (wide=$WLEN narrow=$NLEN)"

# 5. a file that never calls render() → "no frame" diagnostic on stderr + non-zero exit, no hang
ERR="$(COLUMNS=40 LINES=8 NO_COLOR=1 "$EKKO" run --snapshot plain.tsx 2>&1 >/dev/null)"; EXIT3=$?
{ has "no frame" "$ERR" && [ "$EXIT3" -ne 0 ]; } && ok "non-render file gives the no-frame diagnostic and exits non-zero" || bad "no-frame case (exit=$EXIT3): $ERR"

# 6. piped output carries no ANSI escape sequences (is_terminal() false → plain) so it is diff-safe
printf '%s' "$OUT" | grep -q $'\x1b' && bad "piped snapshot leaked ANSI escapes" || ok "piped snapshot is plain (no ANSI)"

echo "ASSERTIONS $PASS $FAIL"
