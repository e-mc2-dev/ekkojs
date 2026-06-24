#!/usr/bin/env python3
# PTR W5.3 — PTY harness for ekko:app/cli interactive prompts. Spawns the real ekko binary in a
# pseudo-terminal (so crossterm's raw-mode readKey sees a real tty), writes scripted keystrokes, and
# asserts the printed RESULT. Linux/macOS only (uses the posix `pty` module). NOT part of the *.e2e.ts
# campaign — run via _build/remote/19-pty-prompts.sh. Exit 0 = all prompts verified.
import os, pty, sys, time, select, subprocess

EKKO = sys.argv[1] if len(sys.argv) > 1 else "ekko"
FIX = sys.argv[2] if len(sys.argv) > 2 else "e2e/_pty"

def run(script, keys, ready_substr):
    """Spawn `ekko run <script>` in a PTY; wait for ready_substr; send keys; return full output."""
    m, s = pty.openpty()
    p = subprocess.Popen([EKKO, "run", os.path.join(FIX, script)],
                         stdin=s, stdout=s, stderr=s, start_new_session=True, close_fds=True)
    os.close(s)
    buf = b""
    deadline = time.time() + 20
    # 1) read until the prompt is rendered (ready) — robust, no fixed sleep
    while time.time() < deadline and ready_substr.encode() not in buf:
        r, _, _ = select.select([m], [], [], 0.5)
        if m in r:
            try: buf += os.read(m, 4096)
            except OSError: break
    # 2) send scripted keystrokes, each followed by a short settle + drain
    for k in keys:
        os.write(m, k)
        time.sleep(0.15)
        r, _, _ = select.select([m], [], [], 0.3)
        if m in r:
            try: buf += os.read(m, 4096)
            except OSError: pass
    # 3) drain until RESULT: appears or process exits
    deadline = time.time() + 10
    while time.time() < deadline and b"RESULT:" not in buf:
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
    return buf.decode(errors="replace")

def result_of(out):
    for line in out.replace("\r", "\n").split("\n"):
        i = line.find("RESULT:")
        if i >= 0:
            return line[i + len("RESULT:"):].strip()
    return None

CASES = [
    # (script, keys, ready_substr, expected) — keys: \r=Enter, \x1b[B=Down
    ("p-input.ts",    [b"a", b"l", b"i", b"c", b"e", b"\r"], "Name?",   "alice"),
    ("p-password.ts", [b"h", b"u", b"n", b"t", b"e", b"r", b"\r"], "Secret?", "hunter"),
    ("p-confirm.ts",  [b"y"],                                "Proceed?", "yes"),
    ("p-select.ts",   [b"\x1b[B", b"\r"],                    "Pick:",    "bravo"),    # down once → bravo
    ("p-select.ts",   [b"\x1b[B", b"\x1b[B", b"\r"],         "Pick:",    "charlie"),  # down twice → charlie
    # multiSelect: space toggles current, down moves; toggle alpha + bravo → "alpha,bravo"
    ("p-multiselect.ts", [b" ", b"\x1b[B", b" ", b"\r"],     "Choose:",  "alpha,bravo"),
]

passed = fails = 0
for script, keys, ready, expected in CASES:
    out = run(script, keys, ready)
    got = result_of(out)
    ok = (got == expected)
    print(f"  {'PASS' if ok else 'FAIL'}: {script} keys={keys} -> {got!r} (expected {expected!r})")
    if ok: passed += 1
    else:
        fails += 1
        print("    --- output ---")
        for ln in out.replace("\r", "\n").split("\n")[-8:]:
            print("    | " + ln)

print(f"\nPTY-PROMPTS: {passed} passed, {fails} failed")
print("PTY-PROMPTS-DONE " + ("PASS" if fails == 0 else "FAIL"))
sys.exit(0 if fails == 0 else 1)
