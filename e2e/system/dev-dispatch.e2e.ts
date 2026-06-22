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
import { tempSubdir, writeText, remove } from "ekko:fs";
import { asserter } from "../_harness";

const t = asserter();
const EKKO = Ekko.args[0];

(async () => {
  t.group("ekko dev — per-kind dispatch (rejects non-client kinds)");

  const runDir = tempSubdir("dev-run");
  writeText(runDir + "/ekko.json", JSON.stringify({ name: "r", version: "0.0.0", type: "run", entry: "main.ts" }));
  writeText(runDir + "/main.ts", "console.log(1);\n");
  const r: any = await exec(EKKO, ["dev"], { cwd: runDir });
  t.ne("`ekko dev` on a `run` project exits non-zero", r.exitCode, 0);
  t.check("reject names rune/web/gui and points to `ekko run`",
    /rune \/ web \/ gui/.test(String(r.stderr) + String(r.stdout)) && /ekko run/.test(String(r.stderr) + String(r.stdout)));

  const libDir = tempSubdir("dev-lib");
  writeText(libDir + "/ekko.json", JSON.stringify({ name: "l", version: "0.0.0", type: "lib", exports: { ".": "./i.ts" } }));
  writeText(libDir + "/i.ts", "export const x = 1;\n");
  const l: any = await exec(EKKO, ["dev"], { cwd: libDir });
  t.ne("`ekko dev` on a `lib` project exits non-zero", l.exitCode, 0);

  const testDir = tempSubdir("dev-test");
  writeText(testDir + "/ekko.json", JSON.stringify({ name: "tt", version: "0.0.0", type: "test" }));
  const tt: any = await exec(EKKO, ["dev"], { cwd: testDir });
  t.ne("`ekko dev` on a `test` project exits non-zero", tt.exitCode, 0);

  try { remove(runDir, { recursive: true }); remove(libDir, { recursive: true }); remove(testDir, { recursive: true }); } catch {  }
  t.done("dev dispatch (m36 task-4)");
})().catch((e) => { console.error("dev-dispatch crashed:", e); t.done("dev dispatch (crashed)"); });
