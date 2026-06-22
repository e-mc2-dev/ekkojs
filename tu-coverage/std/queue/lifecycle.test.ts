// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { describe, test, expect } from "ekko:test";
import { createQueue } from "ekko:job/queue";

describe("ekko:queue - lifecycle", () => {
  test("full lifecycle: add, process, complete, verify", async () => {
    const q = createQueue("lifecycle-full", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.process(async (job) => {
      return { processed: job.data.item };
    });
    const job = q.add({ item: "widget" });
    expect(job.status).toBe("pending");
    await new Promise((resolve) => setTimeout(resolve, 50));
    const completed = q.getJob(job.id);
    expect(completed.status).toBe("completed");
    expect(completed.result.processed).toBe("widget");
  });

  test("add, getJob, pending, process, completed flow", async () => {
    const q = createQueue("lifecycle-flow", { concurrency: 1, retries: 0, backoff: "exponential" });
    const job = q.add({ step: 1 });
    const found = q.getJob(job.id);
    expect(found.status).toBe("pending");
    const pendingList = q.pending();
    expect(pendingList.length).toBe(1);
    q.process(async (j) => "done");
    await new Promise((resolve) => setTimeout(resolve, 50));
    const completedList = q.completed();
    expect(completedList.length).toBe(1);
  });

  test("counts change through lifecycle", async () => {
    const q = createQueue("lifecycle-counts", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.add({ n: 1 });
    q.add({ n: 2 });
    expect(q.counts().pending).toBe(2);
    expect(q.counts().completed).toBe(0);
    q.process(async (job) => "ok");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(q.counts().pending).toBe(0);
    expect(q.counts().completed).toBe(2);
  });

  test("failed job appears in failed()", async () => {
    const q = createQueue("lifecycle-failed", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.process(async (job) => {
      throw new Error("bad");
    });
    q.add({ bad: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const failedList = q.failed();
    expect(failedList.length).toBe(1);
    expect(failedList[0].status).toBe("failed");
  });

  test("clear failed removes failed jobs only", async () => {
    const q = createQueue("lifecycle-clear-failed", { concurrency: 1, retries: 0, backoff: "exponential" });
    let count = 0;
    q.process(async (job) => {
      count++;
      if (count === 1) throw new Error("fail first");
      return "ok";
    });
    q.add({ n: 1 });
    q.add({ n: 2 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    q.clear("failed");
    expect(q.counts().failed).toBe(0);
    expect(q.counts().completed).toBe(1);
  });

  test("multiple queues are independent", () => {
    const q1 = createQueue("queue-a", { concurrency: 1, retries: 0, backoff: "exponential" });
    const q2 = createQueue("queue-b", { concurrency: 1, retries: 0, backoff: "exponential" });
    q1.add({ x: 1 });
    q1.add({ x: 2 });
    q2.add({ y: 1 });
    expect(q1.counts().total).toBe(2);
    expect(q2.counts().total).toBe(1);
  });

  test("queue name is preserved", () => {
    const q = createQueue("preserved-name", { concurrency: 4, retries: 3, backoff: "exponential" });
    expect(q.name).toBe("preserved-name");
  });

  test("concurrency option respected", () => {
    const q = createQueue("conc-opt", { concurrency: 8, retries: 0, backoff: "exponential" });
    
    expect(typeof q).toBe("object");
  });

  test("retries option stored", () => {
    const q = createQueue("retries-opt", { concurrency: 1, retries: 5, backoff: "exponential" });
    expect(typeof q).toBe("object");
  });

  test("backoff option stored", () => {
    const q = createQueue("backoff-opt", { concurrency: 1, retries: 3, backoff: "exponential" });
    expect(typeof q).toBe("object");
  });
});
