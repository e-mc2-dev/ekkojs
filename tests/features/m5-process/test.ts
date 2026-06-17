// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { exec } from "ekko:process";
const c: [string, boolean][] = [];

const r1 = await exec("echo", ["hello world"]);
c.push(["exec stdout", r1.stdout.trim() === "hello world"]);
c.push(["exec exitCode", r1.exitCode === 0]);
c.push(["exec stderr empty", r1.stderr === ""]);

const r2 = await exec("pwd", [], { cwd: "/tmp" });
c.push(["exec cwd", r2.stdout.trim().endsWith("/tmp") || r2.stdout.trim() === "/tmp"]);

const r3 = await exec("sh", ["-c", "exit 42"]);
c.push(["exec non-zero exit", r3.exitCode === 42]);

const r4 = await exec("sleep", ["10"], { timeout: 500 });
c.push(["exec timeout", r4.exitCode === -1]);

let p = 0, f = 0;
for (const [n, ok] of c) {
  if (ok) { p++; console.log("  PASS:", n); }
  else { f++; console.log("  FAIL:", n); }
}
console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
