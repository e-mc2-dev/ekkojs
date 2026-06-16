// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createQueue } from "ekko:job/queue";
import { cron } from "ekko:job/cron";
import { asserter, sleep } from "../_harness.ts";

const t = asserter();
const E: any = (globalThis as any).Ekko;
let JOBS = 500;    
let CYCLES = 4;
try { const v = E.env.get("EKKO_QUEUE_SOAK_JOBS"); if (v) JOBS = Math.max(50, parseInt(v, 10) | 0); } catch {  }
console.log(`[queue-soak] ${CYCLES} cycles x ${JOBS} jobs = ${CYCLES * JOBS} (scale via EKKO_QUEUE_SOAK_JOBS + duration)`);

const heapUsed = () => E.metrics().heap.usedBytes as number;
async function waitUntil(pred: () => boolean, maxMs = 10000): Promise<boolean> {
  const end = Date.now() + maxMs;
  while (Date.now() < end) { if (pred()) return true; await sleep(20); }
  return pred();
}

t.group(`queue endurance — no job loss + correct results (W3.3, ${CYCLES}x${JOBS})`);
const heapStart = heapUsed();
let grandDone = 0, sumOk = true;
for (let c = 0; c < CYCLES; c++) {
  const q: any = createQueue("soak" + c, { concurrency: 8 });
  let done = 0;
  q.process(async (job: any) => { done++; return job.data.x * 2; });
  const ids: number[] = [];
  for (let i = 0; i < JOBS; i++) ids.push(q.add({ x: i }).id);
  const allDone = await waitUntil(() => done >= JOBS);
  if (!allDone) { sumOk = false; }
  
  for (let s = 0; s < JOBS; s += 50) { const j = q.getJob(ids[s]); if (!j || j.status !== "completed" || j.result !== (s) * 2) sumOk = false; }
  grandDone += done;
}
const heapEnd = heapUsed();
const deltaMB = (heapEnd - heapStart) / 1048576;
console.log(`[queue-soak] processed=${grandDone}/${CYCLES * JOBS}; heap start=${(heapStart / 1048576).toFixed(1)}MB end=${(heapEnd / 1048576).toFixed(1)}MB delta=${deltaMB.toFixed(2)}MB`);

t.eq("every job processed across all cycles (no loss/stuck)", grandDone, CYCLES * JOBS);
t.check("sampled job results correct (x*2) + completed", sumOk);
t.check("heap bounded across job churn (no per-job leak)", (heapEnd - heapStart) < 24 * 1024 * 1024);

t.group("cron schedule churn — register/remove many without leak (W3.3)");
{
  const SCHED = 2000;
  const hBefore = heapUsed();
  let okCount = 0;
  for (let i = 0; i < SCHED; i++) {
    const name = "csoak" + i;
    const s = cron.schedule(name, "*/5 * * * *", () => {});
    if (s && s.name === name) okCount++;
    cron.remove(name);
  }
  const hAfter = heapUsed();
  console.log(`[cron-churn] ${SCHED} schedule+remove; heap delta=${((hAfter - hBefore) / 1048576).toFixed(2)}MB`);
  t.eq("all schedules registered cleanly", okCount, SCHED);
  t.check("heap bounded across schedule churn (no per-schedule leak)", (hAfter - hBefore) < 16 * 1024 * 1024);
}

t.check("reached end — queue/cron endurance survived, no hang", true);
t.done("queue/cron endurance soak (W3.3 CI-budget)");
