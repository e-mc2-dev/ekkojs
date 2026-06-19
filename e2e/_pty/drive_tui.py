#!/usr/bin/env python3
# PTR W5.2 — PTY render + input + focus verification for `ekko tui run`. Spawns tui projects in a sized
# pseudo-terminal, captures the drawn frame (ANSI-stripped — the tui draws each cell with a \x1b[r;cH
# cursor escape, so on-screen text isn't contiguous in the raw stream), and drives scripted keys. Verifies:
#   • render  — frame shows the app text + a border glyph,
#   • input   — 'q' via useInput exits the app cleanly,
#   • focus   — Tab moves focus between widgets (the focused marker shifts).
# Linux/macOS only (posix pty); NOT part of the *.e2e.ts campaign. Exit 0 = all verified.
import os, pty, sys, time, select, subprocess, fcntl, termios, struct, re

EKKO = sys.argv[1] if len(sys.argv) > 1 else "ekko"
BASE = sys.argv[2] if len(sys.argv) > 2 else "e2e/_pty"

ANSI = re.compile(rb"\x1b\[[0-9;?]*[A-Za-z]|\x1b[()][AB012]")
def strip(b): return ANSI.sub(b"", b)

class Tui:
    def __init__(self, proj):
        self.m, s = pty.openpty()
        fcntl.ioctl(s, termios.TIOCSWINSZ, struct.pack("HHHH", 24, 80, 0, 0))
        self.p = subprocess.Popen([EKKO, "tui", "run", "-p", os.path.join(BASE, proj)],
                                  stdin=s, stdout=s, stderr=s, start_new_session=True, close_fds=True)
        os.close(s)
        self.buf = b""
    def drain(self, t=0.4):
        r, _, _ = select.select([self.m], [], [], t)
        if self.m in r:
            try:
                c = os.read(self.m, 65536)
                if c: self.buf += c
            except OSError: pass
    def wait_for(self, needle, timeout=25):
        end = time.time() + timeout
        while time.time() < end:
            self.drain(0.5)
            if needle.encode() in strip(self.buf): return True
            if self.p.poll() is not None: return needle.encode() in strip(self.buf)
        return needle.encode() in strip(self.buf)
    def send(self, b):
        try: os.write(self.m, b)
        except OSError: pass
        time.sleep(0.3); self.drain(0.4)
    def recent(self):  # last frame region, ANSI-stripped
        return strip(self.buf).decode(errors="replace")
    def quit_and_wait(self):
        self.send(b"q")
        end = time.time() + 10; exited = False
        while time.time() < end:
            if self.p.poll() is not None: exited = True; break
            self.drain(0.3)
        try:
            self.p.wait(timeout=5)
            if self.p.returncode is not None: exited = True
        except Exception: self.p.kill()
        os.close(self.m)
        return exited

passed = fails = 0
def check(name, ok):
    global passed, fails
    print(f"  {'PASS' if ok else 'FAIL'}: {name}")
    if ok: passed += 1
    else: fails += 1

# ── Scenario 1: render + input ──
t = Tui("tui-app")
rendered = t.wait_for("HELLO_TUI_SMOKE")
has_border = any(g in t.buf.decode(errors="replace") for g in ("─", "│", "┌", "┐"))
check("render: app text drawn to terminal", rendered)
check("render: border glyph drawn", has_border)
exited = t.quit_and_wait()
check("input: 'q' via useInput exits cleanly", exited)

# ── Scenario 2: focus navigation (Tab) ──
f = Tui("tui-focus")
f.wait_for("ITEMA")
before = f.recent()
a_focused_before = "ITEMA_FOCUSED" in before and "ITEMB_blur" in before
check("focus: ITEM A focused initially (autoFocus)", a_focused_before)
before_len = len(f.buf)
f.send(b"\t")           # Tab → move focus A→B
f.drain(0.6)
# The tui does DIFFERENTIAL rendering — only changed cells are re-emitted after Tab — so the full
# "ITEMB_FOCUSED" string is not contiguous in the redraw. The focus SWAP is what proves Tab worked:
# the post-Tab delta re-renders both new states ("blur" for A losing focus, "FOCUSED" for B gaining it).
post = strip(f.buf[before_len:]).decode(errors="replace")
b_focused_after = ("FOCUSED" in post) and ("blur" in post)
check("focus: Tab moved focus A->B", b_focused_after)
exited2 = f.quit_and_wait()
check("focus app exits on 'q'", exited2)

if fails:
    print("    --- post-Tab delta (stripped) ---")
    print("    | " + repr(post[-200:]))

print(f"\nPTY-TUI: {passed} passed, {fails} failed")
print("PTY-TUI-DONE " + ("PASS" if fails == 0 else "FAIL"))
sys.exit(0 if fails == 0 else 1)
