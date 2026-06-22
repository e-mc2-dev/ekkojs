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

t.group("single channel — N messages, backpressure, FIFO, fidelity");
{
  const K = 5000;
  const ch: any = new (Ekko as any).Channel();
  const received: any[] = [];
  const consumer = (async () => { for (let i = 0; i < K; i++) received.push(await ch.recv()); })();
  const producer = (async () => { for (let i = 0; i < K; i++) await ch.send({ n: i, p: "payload" }); })();
  await Promise.all([producer, consumer]);
  t.eq(`all ${K} messages received (no loss, no deadlock)`, received.length, K);
  t.check("FIFO order preserved", received.every((m, i) => m.n === i));
  t.check("payload fidelity through structured-clone", received.every((m) => m.p === "payload"));
}

t.group("many producers → one channel (fan-in), no loss");
{
  const P = 20, M = 500; 
  const ch: any = new (Ekko as any).Channel();
  const seen = new Set<string>();
  const consumer = (async () => { for (let i = 0; i < P * M; i++) { const v = await ch.recv(); seen.add(v.pid + ":" + v.k); } })();
  const producers = Array.from({ length: P }, (_, pid) => (async () => { for (let k = 0; k < M; k++) await ch.send({ pid, k }); })());
  await Promise.all([consumer, ...producers]);
  t.eq(`${P}×${M} = ${P * M} messages, all unique delivered`, seen.size, P * M);
}

t.group("trySend/tryRecv backpressure (non-blocking) is bounded");
{
  const ch: any = new (Ekko as any).Channel();
  let accepted = 0;
  for (let i = 0; i < 100000; i++) { if (ch.trySend(i)) accepted++; else break; } 
  t.check("trySend stops accepting at bounded capacity (no unbounded buffer)", accepted > 0 && accepted < 100000);
  let drained = 0; while (ch.tryRecv() !== undefined) drained++;
  t.eq("tryRecv drains exactly what trySend accepted", drained, accepted);
  t.eq("empty channel tryRecv → undefined", ch.tryRecv(), undefined);
}

t.group("select() fans in across channels under load");
{
  const a: any = new (Ekko as any).Channel();
  const b: any = new (Ekko as any).Channel();
  const N = 1000;
  let got = 0;
  const consumer = (async () => { for (let i = 0; i < N * 2; i++) { const r: any = await (Ekko as any).select([a, b]); if (r && (r.channel === 0 || r.channel === 1)) got++; } })();
  const pa = (async () => { for (let i = 0; i < N; i++) await a.send(i); })();
  const pb = (async () => { for (let i = 0; i < N; i++) await b.send(i); })();
  await Promise.all([consumer, pa, pb]);
  t.eq(`select fanned in all ${N * 2} messages from 2 channels`, got, N * 2);
}

t.check("reached end → channel router survived sustained load (no deadlock/OOM)", true);
t.done("channel router under load (W2.2)");
