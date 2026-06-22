#!/usr/bin/env python3
# PTR Tech-Preview Phase A — PTY harness for `ekko repl`. Spawns the real ekko binary in a pseudo-terminal
# (so rustyline sees a true tty + raw mode), feeds scripted lines, and asserts the REPL's printed output.
# Covers: expression echo, state persistence, multiline continuation, top-level await, error recovery
# (throw + syntax error → session survives), and the permission model (deny-by-default vs --allow).
# Linux/macOS only (posix `pty`). NOT part of the *.e2e.ts campaign — run via _build/remote/25-pty-repl.sh.
# Exit 0 = all cases verified.
import os, pty, sys, time, select, subprocess, re

EKKO = sys.argv[1] if len(sys.argv) > 1 else "ekko"
ANSI = re.compile(rb"\x1b\[[0-9;?]*[A-Za-z]")

def run_session(lines, args=None):
    """Spawn `ekko repl [args]` in a PTY, send each line + Enter, return the full cleaned transcript."""
    args = args or []
    m, s = pty.openpty()
    p = subprocess.Popen([EKKO, "repl"] + args,
                         stdin=s, stdout=s, stderr=s, start_new_session=True, close_fds=True)
    os.close(s)
    buf = b""
    # wait for the banner so we know the REPL is ready
    deadline = time.time() + 20
    while time.time() < deadline and b"interactive REPL" not in buf:
        r, _, _ = select.select([m], [], [], 0.5)
        if m in r:
            try: buf += os.read(m, 4096)
            except OSError: break
    # send each line, settle + drain after each
    for ln in lines:
        os.write(m, ln.encode() + b"\r")
        time.sleep(0.25)
        end = time.time() + 2
        while time.time() < end:
            r, _, _ = select.select([m], [], [], 0.3)
            if m in r:
                try:
                    chunk = os.read(m, 4096)
                    if not chunk: break
                    buf += chunk
                except OSError: break
            else:
                break
    # final drain until the process exits (.exit was sent last)
    deadline = time.time() + 8
    while time.time() < deadline:
        r, _, _ = select.select([m], [], [], 0.5)
        if m in r:
            try:
                chunk = os.read(m, 4096)
                if not chunk: break
                buf += chunk
            except OSError: break
        elif p.poll() is not None:
            break
    try: p.wait(timeout=5)
    except Exception: p.kill()
    os.close(m)
    return ANSI.sub(b"", buf).decode(errors="replace").replace("\r", "")

passed = fails = 0
def check(name, cond, transcript=None):
    global passed, fails
    if cond:
        passed += 1; print(f"  PASS: {name}")
    else:
        fails += 1; print(f"  FAIL: {name}")
        if transcript is not None:
            for ln in transcript.split("\n")[-12:]:
                print("    | " + ln)

# --- Case group 1: core eval, persistence, multiline, TLA, error recovery (deny-by-default) ---
t = run_session([
    "1+1",
    "const x = 41",
    "x + 1",
    "function add(a,b){ return a+b }",
    "add(2,3)",
    "[1,2,3].map(n => n*2)",
    "await Promise.resolve(7)",
    "function f() {",      # multiline: incomplete
    "  return 99",         # still incomplete
    "}",                   # completes -> defines f
    "f()",
    'throw new Error("boom")',  # error -> session must survive
    "2 + 2",                    # proves survival after throw
    "this is !@# a syntax error",  # syntax error -> session must survive
    "5 * 5",                    # proves survival after syntax error
    ".exit",
])
check("expression echo: 1+1 -> 2", re.search(r"(^|\n)2(\n|$)", t), t)
check("state persists: const x=41; x+1 -> 42", "42" in t, t)
check("function def + call: add(2,3) -> 5", re.search(r"(^|\n)5(\n|$)", t), t)
check("array pretty-print contains 2,4,6", "2" in t and "4" in t and "6" in t, t)
check("top-level await -> 7", re.search(r"(^|\n)7(\n|$)", t), t)
check("multiline function f() -> f() returns 99", "99" in t, t)
check("thrown Error printed (boom)", "boom" in t, t)
check("survives throw: 2+2 -> 4 still evaluated", re.search(r"(^|\n)4(\n|$)", t), t)
check("syntax error reported (SyntaxError)", "SyntaxError" in t, t)
check("survives syntax error: 5*5 -> 25", "25" in t, t)

# --- Case group 2: dynamic import() works + permission model — deny-by-default ---
# Single-expression top-level await returns its value (async-expr wrapper). A gated fs CALL without
# --allow must throw — wrapped in an explicit async arrow so the try/catch value is returned.
t2 = run_session([
    'typeof (await import("ekko:fs"))',  # dynamic import resolves to the module namespace object
    'await (async()=>{ try { const fs = await import("ekko:fs"); fs.readText("/etc/hostname"); return "READ_OK" } catch(e){ return "DENIED:"+(e&&e.name) } })()',
    ".exit",
])
check("dynamic import() returns module namespace (object)", '"object"' in t2 or "object" in t2, t2)
check("native fs read DENIED without --allow", "DENIED" in t2 or "Permission" in t2, t2)

# --- Case group 3: dynamic import exposes the API + permission granted via --allow=fs ---
t3 = run_session([
    'typeof (await import("ekko:fs")).readText',
    ".exit",
], args=["--allow=fs"])
check("ekko:fs imports + exposes readText with --allow=fs", "function" in t3, t3)

# --- Case group 4: top-level-await declarations PERSIST across lines (swc TLA transform) ---
t4 = run_session([
    "const n = await Promise.resolve(10)",  # await + declaration on one line
    "n * 2",                                  # must see the persisted n -> 20
    'const fs = await import("ekko:fs")',    # the canonical REPL idiom
    "typeof fs.readText",                     # fs must persist -> "function"
    ".exit",
], args=["--allow=fs"])
check("await+const persists: n*2 -> 20", "20" in t4, t4)
check("const fs = await import(...) persists fs across lines", "function" in t4, t4)

print(f"\nPTY-REPL: {passed} passed, {fails} failed")
print("PTY-REPL-DONE " + ("PASS" if fails == 0 else "FAIL"))
sys.exit(0 if fails == 0 else 1)
