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
const SEQ = 200, BATCHES = 10, PER = 20, TO = 30, ERR = 30; 

t.group("isolate churn — sequential spawns all return correct results");
let okSeq = 0;
for (let i = 0; i < SEQ; i++) { const r = await Ekko.spawn((x: number) => x * 2 + 1, [i]); if (r === i * 2 + 1) okSeq++; }
t.eq(`${SEQ} sequential spawns, all correct`, okSeq, SEQ);

t.group("isolate churn — parallel batches (structured concurrency)");

let okPar = 0, totalPar = 0;
for (let b = 0; b < BATCHES; b++) {
  const fns = Array.from({ length: PER }, () => () => { let s = 0; for (let k = 0; k < 100; k++) s += k; return s; });
  const arr = await Ekko.parallel(fns) as number[];
  if (arr.length === PER && arr.every((v) => v === 4950)) okPar++;
  totalPar += arr.length;
}
t.eq(`${BATCHES} parallel batches × ${PER} all correct`, okPar, BATCHES);
t.eq(`${BATCHES * PER} parallel isolates ran`, totalPar, BATCHES * PER);

t.group("isolate churn — timeout/abort cascade is clean");
let okTo = 0;
for (let i = 0; i < TO; i++) { try { await Ekko.spawn(() => { while (true) {  } }, { timeout: 40 } as any); } catch (e) { if (String(e).includes("timed out")) okTo++; } }
t.eq(`${TO} timed-out spawns each abort cleanly`, okTo, TO);

t.group("isolate churn — error propagation (SpawnError)");
let okErr = 0;
for (let i = 0; i < ERR; i++) { try { await Ekko.spawn(() => { throw new Error("boom-" + i); }); } catch (e: any) { if (e && e.name === "SpawnError") okErr++; } }
t.eq(`${ERR} throwing spawns each reject as SpawnError`, okErr, ERR);

t.group("pool healthy after churn (no leak/exhaustion)");
t.eq(`liveness: spawn works after ${SEQ + BATCHES * PER + TO + ERR} churned isolates`, await Ekko.spawn(() => 7 * 6), 42);
const nested = await Ekko.spawn(async () => { return await Ekko.parallel([() => 1, () => 2]); }) as number[];
t.eq("nested spawn→parallel works after churn", JSON.stringify(nested), "[1,2]");
t.check("reached end → pool survived the churn (no leaked isolates/hang)", true);

t.done("isolate-pool churn (W2.1)");
