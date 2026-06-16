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
import { createServer, fetch } from "ekko:web";
import { asserter, sleep } from "../_harness.ts";

const t = asserter();
const EKKO = (globalThis as any).Ekko.args[0];
const ev = (code: string) => [EKKO, ["eval", code]] as [string, string[]];
async function waitUntil(pred: () => boolean, maxMs = 5000): Promise<boolean> {
  const end = Date.now() + maxMs;
  while (Date.now() < end) { if (pred()) return true; await sleep(25); }
  return pred();
}
async function fetchFails(url: string): Promise<boolean> {
  try { const r: any = await fetch(url); return !r || !r.ok || r.status === 0; }
  catch { return true; }
}

(async () => {
  t.group("fault: kill a long-running child mid-op → onExit fires, no hang");
  {
    const child: any = spawn(...ev("setTimeout(() => {}, 60000)")); 
    let exitCode: number | null = null;
    child.onExit((c: number) => { exitCode = c; });
    t.type("child.pid before kill", child.pid, "number");
    child.kill();
    t.ok("killed child's onExit fires (bounded, no hang)", await waitUntil(() => exitCode !== null));
  }

  t.group("fault: a crashing child → failure surfaced cleanly via exitCode");
  {
    const r = await exec(...ev("throw new Error('chaos-boom')"));
    t.eq("uncaught-throw child → exit 1", r.exitCode, 1);
    t.ok("crash reason captured on stderr", r.stderr.includes("chaos-boom"));
    const r2 = await exec(...ev("Ekko.exit(137)"));
    t.eq("explicit failure exit code surfaced", r2.exitCode, 137);
  }

  t.group("fault: network partition — connect to a refused port → clean error, no hang");
  {
    const failed = await fetchFails("http://127.0.0.1:39001/"); 
    t.check("fetch to refused port → bounded failure (threw or !ok), not a hang", failed);
  }

  t.group("fault: server dies mid-life → in-flight client sees a clean error");
  {
    const P = 39002;
    const app: any = createServer({ host: "127.0.0.1", port: P });
    app.get("/", (_req: any, res: any) => res.text("up"));
    app.start();
    const ok: any = await fetch(`http://127.0.0.1:${P}/`);
    t.eq("server up → 200", ok.status, 200);
    t.eq("server up → body", await ok.text(), "up");
    app.stop(); 
    await sleep(100);
    const failed = await fetchFails(`http://127.0.0.1:${P}/`);
    t.check("fetch after server stop → bounded failure, not a hang", failed);
  }

  t.check("reached end — all faults degraded gracefully, no hang/crash", true);
  t.done("chaos / fault injection (W6.4)");
})();
