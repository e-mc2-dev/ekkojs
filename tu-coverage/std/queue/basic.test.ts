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

describe("ekko:queue - basic operations", () => {
  test("createQueue returns an object", () => {
    const q = createQueue("test-basic", { concurrency: 1, retries: 0, backoff: "exponential" });
    expect(typeof q).toBe("object");
    expect(q).not.toBe(null);
  });

  test("createQueue has name property", () => {
    const q = createQueue("my-queue", { concurrency: 2, retries: 1, backoff: "exponential" });
    expect(q.name).toBe("my-queue");
  });

  test("add returns job object with id", () => {
    const q = createQueue("add-test", { concurrency: 1, retries: 0, backoff: "exponential" });
    const job = q.add({ task: "hello" });
    expect(job).not.toBe(null);
    expect(typeof job.id).not.toBe("undefined");
  });

  test("add job has status pending", () => {
    const q = createQueue("status-test", { concurrency: 1, retries: 0, backoff: "exponential" });
    const job = q.add({ x: 1 });
    expect(job.status).toBe("pending");
  });

  test("add job has data property", () => {
    const q = createQueue("data-test", { concurrency: 1, retries: 0, backoff: "exponential" });
    const job = q.add({ payload: "abc" });
    expect(job.data.payload).toBe("abc");
  });

  test("add multiple jobs each gets unique id", () => {
    const q = createQueue("unique-id", { concurrency: 1, retries: 0, backoff: "exponential" });
    const j1 = q.add({ n: 1 });
    const j2 = q.add({ n: 2 });
    const j3 = q.add({ n: 3 });
    expect(j1.id).not.toBe(j2.id);
    expect(j2.id).not.toBe(j3.id);
    expect(j1.id).not.toBe(j3.id);
  });

  test("getJob returns job by id", () => {
    const q = createQueue("get-job", { concurrency: 1, retries: 0, backoff: "exponential" });
    const job = q.add({ val: 42 });
    const found = q.getJob(job.id);
    expect(found).not.toBe(null);
    expect(found.id).toBe(job.id);
    expect(found.data.val).toBe(42);
  });

  test("getJob returns null for unknown id", () => {
    const q = createQueue("get-unknown", { concurrency: 1, retries: 0, backoff: "exponential" });
    const found = q.getJob("nonexistent-id-999");
    expect(found).toBe(null);
  });

  test("getJobs returns all jobs", () => {
    const q = createQueue("get-all", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.add({ a: 1 });
    q.add({ b: 2 });
    q.add({ c: 3 });
    const jobs = q.getJobs();
    expect(jobs.length).toBe(3);
  });

  test("getJobs with status filter returns matching jobs", () => {
    const q = createQueue("filter-jobs", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.add({ x: 1 });
    q.add({ x: 2 });
    const pending = q.getJobs("pending");
    expect(pending.length).toBe(2);
    for (const j of pending) {
      expect(j.status).toBe("pending");
    }
  });

  test("pending returns pending jobs", () => {
    const q = createQueue("pending-test", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.add({ item: "one" });
    q.add({ item: "two" });
    const p = q.pending();
    expect(p.length).toBe(2);
  });

  test("counts returns correct totals", () => {
    const q = createQueue("counts-test", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.add({ n: 1 });
    q.add({ n: 2 });
    const c = q.counts();
    expect(c.pending).toBe(2);
    expect(c.active).toBe(0);
    expect(c.completed).toBe(0);
    expect(c.failed).toBe(0);
    expect(c.total).toBe(2);
  });

  test("clear removes all jobs", () => {
    const q = createQueue("clear-all", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.add({ a: 1 });
    q.add({ b: 2 });
    q.clear();
    const c = q.counts();
    expect(c.total).toBe(0);
  });

  test("clear with status removes only that status", () => {
    const q = createQueue("clear-status", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.add({ a: 1 });
    q.add({ b: 2 });
    
    q.clear("completed");
    const c = q.counts();
    expect(c.pending).toBe(2);
  });

  test("add with priority sets priority field", () => {
    const q = createQueue("priority-test", { concurrency: 1, retries: 0, backoff: "exponential" });
    const job = q.add({ task: "urgent" }, { priority: 1 });
    expect(job.priority).toBe(1);
  });
});
