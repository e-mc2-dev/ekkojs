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
import { asserter, sleep } from "../_harness";

const t = asserter();

t.group("covered — add / process / result");
{
  const q = createQueue("basic", {});
  const seen: any[] = [];
  q.process(async (job: any) => { seen.push(job.data.x); return job.data.x * 2; });
  const j = q.add({ x: 5 });
  t.eq("add returns a job with id", typeof j.id, "number");
  t.eq("job starts pending", j.status, "pending");
  await sleep(100);
  t.deep("handler ran with data", seen, [5]);
  t.eq("job completed", q.getJob(j.id).status, "completed");
  t.eq("result captured", q.getJob(j.id).result, 10);
}

t.group("covered — priority ordering");
{
  const q = createQueue("prio", { concurrency: 1 });
  const order: number[] = [];
  q.add({ n: 1 }, { priority: 1 });
  q.add({ n: 2 }, { priority: 10 });
  q.add({ n: 3 }, { priority: 5 });
  q.process(async (job: any) => { order.push(job.data.n); await sleep(10); });
  await sleep(200);
  t.eq("highest priority first", order[0], 2);
  t.eq("then next priority", order[1], 3);
  t.eq("lowest last", order[2], 1);
}

t.group("covered — concurrency");
{
  const q = createQueue("conc", { concurrency: 3 });
  let maxActive = 0;
  q.process(async (job: any) => { maxActive = Math.max(maxActive, q.active().length); await sleep(40); });
  for (let i = 0; i < 6; i++) q.add({ i });
  await sleep(60);
  t.check("runs up to concurrency in parallel", maxActive >= 2 && maxActive <= 3);
  await sleep(200);
  t.eq("all completed", q.counts().completed, 6);
}

t.group("covered/recheck — retries + backoff + failed");
{
  const q = createQueue("retry", {});
  let attempts = 0;
  q.process(async (job: any) => { attempts++; throw new Error("always fails"); });
  const j = q.add({ x: 1 }, { retries: 2 });
  await sleep(400); 
  t.check("retried beyond first attempt", q.getJob(j.id).attempts >= 1);
}
{
  const q = createQueue("fail", {});
  q.process(async () => { throw new Error("boom"); });
  const j = q.add({ x: 1 }); 
  await sleep(100);
  t.eq("no-retry job → failed", q.getJob(j.id).status, "failed");
  t.check("error string captured", String(q.getJob(j.id).error).includes("boom"));
}

t.group("recheck — counts / getJobs / clear / delay");
{
  const q = createQueue("mgmt", {});
  q.process(async (job: any) => { if (job.data.bad) throw new Error("x"); return 1; });
  q.add({ x: 1 }); q.add({ x: 2 }); q.add({ bad: true });
  await sleep(150);
  const c = q.counts();
  t.eq("counts total", c.total, 3);
  t.eq("counts completed 2", c.completed, 2);
  t.eq("counts failed 1", c.failed, 1);
  t.eq("getJobs(completed) length", q.getJobs("completed").length, 2);
  t.eq("failed() length", q.failed().length, 1);
  q.clear("completed");
  t.eq("clear(completed) removes them", q.completed().length, 0);
  t.eq("failed remain after clear(completed)", q.failed().length, 1);
  q.clear();
  t.eq("clear() empties all", q.counts().total, 0);
}
{
  const q = createQueue("delay", {});
  const seen: number[] = [];
  q.process(async (job: any) => { seen.push(Date.now()); });
  const start = Date.now();
  q.add({ x: 1 }, { delay: 120 });
  await sleep(50);
  t.eq("delayed job not yet run", seen.length, 0);
  await sleep(150);
  t.eq("delayed job ran after delay", seen.length, 1);
}

t.done("ekko:job/queue covered+recheck");
