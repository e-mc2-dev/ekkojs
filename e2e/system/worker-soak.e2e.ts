// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { asserter } from "../_harness";

const t = asserter();
const E: any = (globalThis as any).Ekko;
let N = 50; 
try { const v = E.env.get("EKKO_SOAK_REQUESTS"); if (v) N = Math.max(10, parseInt(v, 10) | 0); } catch {  }
const PAYLOAD = 512 * 1024; 
console.log(`[worker-soak] worker does 2 x ${N} nested spawns returning ${(PAYLOAD / 1024) | 0}KB each (set EKKO_SOAK_REQUESTS to scale)`);

t.group(`worker (spawn) loop — bounded memory under async completions (task 241 sibling, 2x${N})`);

const worker = async (n: number, payload: number): Promise<{ ok: number; b1: number; b2: number }> => {
  const W: any = (globalThis as any).Ekko;
  const heap = () => W.metrics().heap.usedBytes as number;
  let ok = 0;
  async function drive(k: number): Promise<void> {
    for (let i = 0; i < k; i++) {

      const s: string = await W.spawn((sz: number) => "x".repeat(sz), [payload]);
      if (s.length === payload) ok++;
    }
  }
  await drive(n);
  const b1 = heap();
  await drive(n);
  const b2 = heap();
  return { ok, b1, b2 };
};

const res = await E.spawn(worker, [N, PAYLOAD]) as { ok: number; b1: number; b2: number };

t.eq("worker: every nested spawn returned the full payload (both batches)", res.ok, 2 * N);

const delta = res.b2 - res.b1; 
console.log(`[worker-soak] worker heap after b1=${(res.b1 / 1048576).toFixed(1)}MB, after b2=${(res.b2 / 1048576).toFixed(1)}MB, b2 delta=${(delta / 1048576).toFixed(2)}MB`);

t.check("worker completion loop does not climb heap linearly (no per-completion leak)", delta < 16 * 1024 * 1024);

t.check("reached end — worker survived the async load, no hang/crash", true);
t.done("worker (spawn) loop soak (task 241 sibling)");
