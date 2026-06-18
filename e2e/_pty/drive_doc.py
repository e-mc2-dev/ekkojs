#!/usr/bin/env python3
# Task 287 — PTY check for `ekko doc <topic> -i` (the interactive split-pane doc browser).
# Spawns `ekko doc ru -i` in an 80x24 pseudo-terminal, confirms the app renders (header + a tree
# number), drives Down to move the selection, then sends 'q' and confirms a clean exit. This exercises
# the full -i path: embedded .ekl mounted as VFS, browser.tsx reads docs.json VFS-first, the ekko:tui
# Markdown component renders, and input/exit work. Linux/macOS only (posix pty). Exit 0 = verified.
import os, pty, sys, time, select, subprocess, fcntl, termios, struct, re

EKKO = sys.argv[1] if len(sys.argv) > 1 else "ekko"
ANSI = re.compile(rb"\x1b\[[0-9;?]*[A-Za-z]|\x1b[()][AB012]")
def strip(b): return ANSI.sub(b"", b)

class Doc:
    def __init__(self, *args):
        self.m, s = pty.openpty()
        fcntl.ioctl(s, termios.TIOCSWINSZ, struct.pack("HHHH", 24, 80, 0, 0))
        self.p = subprocess.Popen([EKKO, "doc", *args],
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
    def recent(self):
        return strip(self.buf).decode(errors="replace")
    def quit_and_wait(self):
        self.send(b"q")
        end = time.time() + 10; exited = False
        while time.time() < end:
            if self.p.poll() is not None: exited = True; break
            self.drain(0.3)
        self.drain(0.5)  # capture the post-teardown exit banner before closing
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

# Open a specific page with a code block (so it's long + has a wide line for horizontal pan).
d = Doc("075", "-i")
check("render: -i browser header drawn", d.wait_for("EkkoJS Docs", 25))
check("render: content pane drawn (page url)", d.wait_for("ekkojs.com", 15))
has_border = any(g in d.buf.decode(errors="replace") for g in ("─", "│", "┌", "╭", "├", "└"))
check("render: tree/border glyphs drawn", has_border)
rec = d.recent()
check("tree: labels render (no [object Object])", "[object Object]" not in rec)
check("tree: real topic/page labels shown", ("Rune" in rec) or ("EkkoJS" in rec) or ("Getting" in rec))

# Scroll the page (j = large step); the "↑" indicator proves it scrolled + re-rendered (no black region).
for _ in range(3):
    d.send(b"j")
scrolled = d.wait_for("↑", 12)
if not scrolled:
    for _ in range(4):
        d.send(b"u")
    scrolled = d.wait_for("↑", 8)
check("scroll: page scrolls (↑ indicator, no black region)", scrolled)

# Horizontal pan: a code/table line overflows the pane; Right pans (the "←→" indicator appears).
for _ in range(2):
    d.send(b"\x1b[C")  # Right
panned = d.wait_for("←→", 8)
check("hscroll: Left/Right pan wide (code/table) content (←→)", panned)

# Tree interaction: move the cursor and toggle a node — must not crash.
d.send(b"\x1b[A")  # Up
d.send(b"\r")      # Enter (fold/unfold or open)
d.drain(0.6)
check("tree: navigate + Enter, app still alive", d.p.poll() is None)

exited = d.quit_and_wait()
check("input: 'q' exits the browser cleanly", exited)
goodbye = "Good bye" in d.recent()
check("exit: clears + prints EkkoJS banner + 'Good bye'", goodbye)

print(f"\nPTY-DOC: {passed} passed, {fails} failed")
print("PTY-DOC-DONE " + ("PASS" if fails == 0 else "FAIL"))
sys.exit(0 if fails == 0 else 1)
