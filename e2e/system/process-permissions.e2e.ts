// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { exec, spawn } from "ekko:process";
import { asserter } from "../_harness.ts";

const t = asserter();
const EKKO = Ekko.args[0];

let denied = false;
try { spawn(EKKO, ["eval", "1+1"]); } catch (e) {
  denied = /PermissionError|process access denied/.test(String((e as any)?.message ?? e));
}
if (!denied) {
  console.log("");
  console.log("✗ MISCONFIGURED — process-permissions.e2e.ts must run WITHOUT --allow=process:");
  console.log("      ekko run e2e/system/process-permissions.e2e.ts        (no --allow)");
  console.log("    (or simply: bash e2e/run-all.sh <ekko>)");
  console.log("  spawn was ALLOWED → you granted `process`.");
  console.log("ASSERTIONS 0 1");
  Ekko.exit(1);
}

t.group("exec / spawn denied without --allow=process");
t.denied("spawn(ekko, …) denied", () => spawn(EKKO, ["eval", "1+1"]));
t.denied("spawn(echo, …) denied", () => spawn("echo", ["hi"]));
t.denied("exec(ekko --version) denied", () => exec(EKKO, ["--version"]));
t.denied("exec(echo) denied", () => exec("echo", ["hi"]));

t.done("ekko:process security/permission");
