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
import { tempSubdir, writeText, readText, exists, remove } from "ekko:fs";
import { asserter, sleep } from "../_harness";

const t = asserter();
const WIN = Ekko.platform === "win32";
const EKKO = Ekko.args[0];

const read = (p: string): string => { try { return exists(p) ? readText(p) : ""; } catch { return ""; } };

(async () => {
  t.group("ekko dev — supervised server cannot orphan");

  const dir = tempSubdir("dev-no-orphan");
  const hb = dir.replace(/\\/g, "/") + "/heartbeat.txt";

  
  
  writeText(dir + "/ekko.json",
    JSON.stringify({ name: "devorphan", version: "0.0.0", type: "web", entry: "serve.ts" }));
  writeText(dir + "/serve.ts",
    `import { writeText } from "ekko:fs";\n` +
    `const HB = ${JSON.stringify(hb)};\n` +
    `setInterval(() => { try { writeText(HB, String(Date.now())); } catch (e) {} }, 150);\n` +
    `console.log("HB UP");\n`);

  
  const dev = spawn(EKKO, ["dev"], { cwd: dir });
  t.type("dev parent has a numeric pid", dev.pid, "number");

  let up = false;
  for (let i = 0; i < 80 && !up; i++) { await sleep(250); up = read(hb) !== ""; }
  t.ok("child server came up (heartbeat present)", up);

  const a = read(hb);
  await sleep(600);
  const b = read(hb);
  t.ok("heartbeat advances while the parent is alive", a !== "" && b !== "" && a !== b);

  
  if (WIN) await exec("taskkill", ["/PID", String(dev.pid), "/F"]);
  else await exec("kill", ["-TERM", String(dev.pid)]);

  await sleep(1600);
  const c = read(hb);
  await sleep(1300);
  const d = read(hb);
  t.eq("heartbeat FROZEN after parent death (no orphan)", c, d);
  t.ok("heartbeat actually stopped (not just transiently)", c === d);

  try { dev.kill(); } catch {  }
  try { remove(dir, { recursive: true }); } catch {  }

  t.done("dev-no-orphan");
})().catch((e) => { console.error("dev-no-orphan crashed:", e); t.done("dev-no-orphan (crashed)"); });
