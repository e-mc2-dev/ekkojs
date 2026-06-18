#!/usr/bin/env python3
# Tech-Preview B0/B2 — doc-as-test. Runs every file in examples/ exactly as its `// Run:` header says and
# asserts (a) exit code 0 and (b) every non-placeholder line of its `// Output:` block appears in stdout.
# A doc/example that doesn't run is a preview-blocking bug. Cross-platform (uses sys.executable-agnostic
# subprocess). Run via _build/remote/26-doc-as-test.sh (Linux/macOS) or directly with the binary path.
import os, sys, subprocess, glob, re

EKKO = sys.argv[1] if len(sys.argv) > 1 else "ekko"
ROOT = sys.argv[2] if len(sys.argv) > 2 else "."
examples = sorted(glob.glob(os.path.join(ROOT, "examples", "*.ts")))

# Doc snippets: every ```ts fenced block in README/QUICKSTART whose first line is `// Run:` is a runnable
# snippet — extracted to a temp file and run exactly like an example, so the docs can never lie (B2).
DOC_FILES = ["README.md", "QUICKSTART.md"]
doc_snippets = []  # (label, code)
for doc in DOC_FILES:
    p = os.path.join(ROOT, doc)
    if not os.path.exists(p):
        continue
    with open(p, "r", encoding="utf-8") as f:
        md = f.read()
    for i, block in enumerate(re.findall(r"```(?:ts|typescript|js)\n(.*?)```", md, re.DOTALL)):
        if re.match(r"\s*//\s*Run:", block):
            doc_snippets.append((f"{doc}#snippet{i+1}", block))

def parse_header(text):
    run, out = None, []
    in_out = False
    for line in text.splitlines():
        s = line.strip()
        m = re.match(r"//\s*Run:\s*ekko\s+run\s+(.*)$", s)
        if m:
            run = m.group(1).strip()
            continue
        if re.match(r"//\s*Output:\s*$", s):
            in_out = True
            continue
        if in_out:
            mo = re.match(r"//\s?(.*)$", line.rstrip("\n"))
            if mo is not None:
                out.append(mo.group(1))
            else:
                in_out = False
    # trim leading/trailing blank expected lines
    while out and out[0].strip() == "": out.pop(0)
    while out and out[-1].strip() == "": out.pop()
    return run, out

import tempfile

# Build the work list: (name, text, run_path_override). Examples run at their real path; doc snippets are
# written to a temp file and run with only the --allow flags from their `// Run:` line.
work = []
for ex in examples:
    with open(ex, "r", encoding="utf-8") as f:
        work.append((os.path.relpath(ex, ROOT), f.read(), None))
for (label, code) in doc_snippets:
    tf = tempfile.NamedTemporaryFile(mode="w", suffix=".ts", delete=False, dir=ROOT, encoding="utf-8")
    tf.write(code); tf.close()
    work.append((label, code, os.path.relpath(tf.name, ROOT)))

passed = failed = 0
for (name, text, override) in work:
    run, expected = parse_header(text)
    if not run:
        print(f"  FAIL: {name} — no `// Run:` header"); failed += 1; continue
    if override is not None:
        # snippet: keep only flags (e.g. --allow=fs), point at the temp file
        flags = [tok for tok in run.split() if tok.startswith("-")]
        args = flags + [override]
    else:
        args = run.split()
    try:
        p = subprocess.run([EKKO, "run"] + args, capture_output=True, text=True, timeout=60, cwd=ROOT)
    except Exception as e:
        print(f"  FAIL: {name} — could not execute: {e}"); failed += 1; continue
    out = (p.stdout or "")
    # filter integrity-check noise from unsigned debug builds (release is clean)
    out = "\n".join(l for l in out.splitlines() if "integrity check" not in l and "EkkoNative" not in l)
    ok = (p.returncode == 0)
    missing = []
    for line in expected:
        if line.strip() == "" or "<" in line:  # skip blanks + placeholder lines like <linux|...>
            continue
        if line not in out:
            missing.append(line)
    if ok and not missing:
        print(f"  PASS: {name}"); passed += 1
    else:
        failed += 1
        print(f"  FAIL: {name} — exit={p.returncode}" + (f", missing {missing}" if missing else ""))
        for l in (p.stdout or "").splitlines()[-6:]: print("    out| " + l)
        for l in (p.stderr or "").splitlines()[-6:]: print("    err| " + l)

# Clean up temp snippet files.
for (_n, _t, override) in work:
    if override is not None:
        try: os.unlink(os.path.join(ROOT, override))
        except OSError: pass

print(f"\nDOC-EXAMPLES: {passed} passed, {failed} failed ({len(examples)} examples + {len(doc_snippets)} doc snippets)")
print("DOC-EXAMPLES-DONE " + ("PASS" if failed == 0 else "FAIL"))
sys.exit(0 if failed == 0 else 1)
