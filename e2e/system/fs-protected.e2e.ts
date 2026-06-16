// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { stat, read, readDir, writeText, readText, exists, remove, tempSubdir } from "ekko:fs";
import { dirname } from "ekko:fs/path";
import { asserter } from "../_harness.ts";

const t = asserter();

const bin = Ekko.args[0];
const runtimeDir = dirname(bin);

t.group("runtime binary folder is blocked (despite full --allow=fs)");
t.ok("Ekko.args[0] looks like the ekko binary", typeof bin === "string" && /ekko(\.exe)?$/.test(bin));
t.denied("stat the running binary", () => stat(bin));
t.denied("read the running binary", () => read(bin));
t.denied("readDir the runtime folder", () => readDir(runtimeDir));
t.denied("stat the runtime folder", () => stat(runtimeDir));
t.denied("write into the runtime folder", () => writeText(runtimeDir + "/ekko_evil.txt", "x"));
t.denied("`..` traversal that lands inside the runtime folder is blocked", () => writeText(runtimeDir + "/sub/../ekko_evil2.txt", "x"));
t.denied("exists() on the binary is gated (throws, not false)", () => { exists(bin); });

t.group("package store (~/.ekko/store) is blocked");
const home = Ekko.env.get("USERPROFILE") || Ekko.env.get("HOME") || "";
t.ok("resolved a home dir", home.length > 0);
const store = home + "/.ekko/store";
t.denied("stat the package store root", () => stat(store));
t.denied("read under the package store", () => read(store + "/anything"));
t.denied("write under the package store", () => writeText(store + "/evil.txt", "x"));

t.group("non-protected paths still work with full fs (no over-blocking)");
const sb = tempSubdir("ekko-fs-protected");
t.notThrows("write a normal temp file", () => writeText(sb + "/ok.txt", "fine"));
t.eq("read it back", readText(sb + "/ok.txt"), "fine");
t.eq("exists() works on a normal path", exists(sb + "/ok.txt"), true);
t.notThrows("cleanup", () => remove(sb, true));

t.done("ekko:fs security/protected");
