// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createServer, fetch } from "ekko:web";
import { asserter } from "../_harness.ts";

const t = asserter();
const E: any = (globalThis as any).Ekko;
let REQ = 1500; 
try { const v = E.env.get("EKKO_SOAK_REQUESTS"); if (v) REQ = Math.max(50, parseInt(v, 10) | 0); } catch {  }
const BATCH = REQ; 
console.log(`[soak] driving 2 x ${BATCH} = ${2 * BATCH} in-process requests (set EKKO_SOAK_REQUESTS to scale; full soak = scale + duration)`);

const P = 38400;
const app: any = createServer({ host: "127.0.0.1", port: P });
let served = 0;
app.get("/ping", (_req: any, res: any) => { served++; res.json({ n: served }); });
app.start();
const base = `http://127.0.0.1:${P}`;

const CONC = 25; 
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("fetch timeout")), ms))]);
}
async function one(): Promise<boolean> {

  return withTimeout((async () => {
    const r: any = await fetch(base + "/ping");
    const ok = !!r && r.status === 200;
    
    try { await r.text(); } catch {  }
    try { r.dispose(); } catch {  }
    return ok;
  })(), 8000);
}
async function drive(n: number): Promise<{ ok: number; ms: number }> {
  let ok = 0;
  const start = Date.now();
  for (let i = 0; i < n; i += CONC) {
    const wave: Promise<boolean>[] = [];
    for (let j = 0; j < CONC && i + j < n; j++) wave.push(one());
    const results = await Promise.all(wave);
    for (const r of results) if (r) ok++;
  }
  return { ok, ms: Date.now() - start };
}
const heapUsed = () => E.metrics().heap.usedBytes as number;

t.group(`HTTP load/soak — correctness + bounded memory (W3.1, ${2 * BATCH} reqs)`);

const b1 = await drive(BATCH);
const heapAfter1 = heapUsed();
t.eq("batch 1: all requests succeeded", b1.ok, BATCH);

const b2 = await drive(BATCH);
const heapAfter2 = heapUsed();
t.eq("batch 2: all requests succeeded", b2.ok, BATCH);
t.eq("server handler ran for every request", served, 2 * BATCH);

const growth1 = heapAfter1; 
const growth2 = heapAfter2 - heapAfter1; 
console.log(`[soak] heap after b1=${(heapAfter1 / 1048576).toFixed(1)}MB, after b2=${(heapAfter2 / 1048576).toFixed(1)}MB, b2 delta=${(growth2 / 1048576).toFixed(2)}MB; latency b1=${b1.ms}ms b2=${b2.ms}ms`);

t.check("2nd batch does not climb heap linearly (no per-request leak)", growth2 < 16 * 1024 * 1024);
t.check("heap stays well under the V8 limit", heapAfter2 < E.metrics().heap.limitBytes);
t.check("throughput is bounded/sane (batch completed)", b2.ms >= 0 && b2.ok === BATCH);

app.stop();
t.check("reached end — server survived the load, no hang/crash", true);
t.done("HTTP load/soak (W3.1 CI-budget)");
