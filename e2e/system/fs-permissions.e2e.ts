// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { readText, writeText, exists, stat, mkdir, readDir, remove, symlink } from "ekko:fs";
import { asserter } from "../_harness.ts";

const t = asserter();
const WIN = Ekko.platform === "win32";

const IN = "e2e/_secfix/sandbox";          
const OUTSIDE = "e2e/_secfix/outside.txt"; 

let scopedGrant = false;
try { readText(OUTSIDE); } catch { scopedGrant = true; } 
if (!scopedGrant) {
  console.log("");
  console.log("✗ MISCONFIGURED — fs-permissions.e2e.ts needs the SCOPED grant, not broad fs:");
  console.log("      ekko run e2e/system/fs-permissions.e2e.ts --allow=fs:e2e/_secfix/sandbox/**");
  console.log("    (run from the repo root, or simply: bash e2e/run-all.sh <ekko>)");
  console.log("  An out-of-scope read was ALLOWED, so you granted broader fs (--allow=fs/all).");
  console.log("ASSERTIONS 0 1");
  Ekko.exit(1);
}

t.group("allow works — in-scope access is permitted");
t.eq("read in-scope fixture", readText(IN + "/allowed.txt"), "in-scope");
t.eq("exists in-scope true", exists(IN + "/allowed.txt"), true);
t.notThrows("write a new in-scope file", () => writeText(IN + "/_w.txt", "ok"));
t.eq("read back in-scope write", readText(IN + "/_w.txt"), "ok");
t.notThrows("stat in-scope", () => stat(IN + "/allowed.txt"));
t.notThrows("mkdir in-scope subdir", () => mkdir(IN + "/_sub"));
t.notThrows("readDir the scope root", () => readDir(IN));
t.notThrows("remove in-scope file", () => remove(IN + "/_w.txt"));
t.notThrows("remove in-scope subdir", () => remove(IN + "/_sub"));

t.group("escape blocked — out-of-scope access is denied");

t.denied("read sibling outside scope", () => readText(OUTSIDE));
t.denied("stat sibling outside scope", () => stat(OUTSIDE));
t.denied("exists() outside scope is gated (throws, not false)", () => { exists(OUTSIDE); });

t.denied("read `..` escape to existing outside", () => readText(IN + "/../outside.txt"));

t.denied("WRITE `..` escape to non-existent target", () => writeText(IN + "/../ESCAPED.txt", "pwned"));
t.denied("WRITE deeper `..` escape", () => writeText(IN + "/../../ESCAPED2.txt", "pwned"));
t.denied("mkdir `..` escape", () => mkdir(IN + "/../escdir"));
t.denied("read `..` escape to non-existent", () => readText(IN + "/../nope-secret.txt"));

t.denied("readDir the parent (outside scope)", () => readDir("e2e/_secfix"));
t.denied("read repo Cargo.toml (outside scope)", () => readText("Cargo.toml"));

const sysPath = WIN ? "C:/Windows/win.ini" : "/etc/hostname";
t.denied("read absolute system path", () => readText(sysPath));
t.denied("write absolute system path", () => writeText(WIN ? "C:/Windows/ekko_evil.txt" : "/etc/ekko_evil.txt", "x"));

t.denied("cannot create symlink whose target escapes scope", () => symlink(OUTSIDE, IN + "/link"));

t.denied("escaped target is itself unreadable (still out of scope)", () => readText("e2e/_secfix/ESCAPED.txt"));

t.done("ekko:fs security/scoped");
