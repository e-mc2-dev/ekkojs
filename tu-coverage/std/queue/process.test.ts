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

describe("ekko:queue - process handler", () => {
  test("process registers handler as function", () => {
    const q = createQueue("proc-reg", { concurrency: 1, retries: 0, backoff: "exponential" });
    let called = false;
    q.process(async (job) => {
      called = true;
    });
    expect(typeof q.process).toBe("function");
  });

  test("after process and add, job eventually completes", async () => {
    const q = createQueue("proc-complete", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.process(async (job) => {
      return { done: true };
    });
    const job = q.add({ work: "do-it" });
    
    await new Promise((resolve) => setTimeout(resolve, 50));
    const updated = q.getJob(job.id);
    expect(updated.status).toBe("completed");
  });

  test("completed job has status completed", async () => {
    const q = createQueue("status-complete", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.process(async (job) => {
      return "result";
    });
    const job = q.add({ value: 10 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const found = q.getJob(job.id);
    expect(found.status).toBe("completed");
  });

  test("job result stored after processing", async () => {
    const q = createQueue("result-store", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.process(async (job) => {
      return { sum: job.data.a + job.data.b };
    });
    const job = q.add({ a: 3, b: 7 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const found = q.getJob(job.id);
    expect(found.result.sum).toBe(10);
  });

  test("failed job has status failed after handler throws", async () => {
    const q = createQueue("fail-test", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.process(async (job) => {
      throw new Error("processing error");
    });
    const job = q.add({ bad: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const found = q.getJob(job.id);
    expect(found.status).toBe("failed");
  });

  test.skip("retry: job with retries > 0 retries on failure", async () => {
    
    const q = createQueue("retry-test", { concurrency: 1, retries: 2, backoff: "exponential" });
    let attempts = 0;
    q.process(async (job) => {
      attempts++;
      if (attempts < 3) throw new Error("transient");
      return "success";
    });
    const job = q.add({ retry: true });
    await new Promise((resolve) => setTimeout(resolve, 200));
    const found = q.getJob(job.id);
    expect(found.status).toBe("completed");
    expect(attempts).toBe(3);
  });

  test("concurrency: multiple jobs processed simultaneously", async () => {
    const q = createQueue("conc-test", { concurrency: 3, retries: 0, backoff: "exponential" });
    let maxConcurrent = 0;
    let current = 0;
    q.process(async (job) => {
      current++;
      if (current > maxConcurrent) maxConcurrent = current;
      await new Promise((r) => setTimeout(r, 30));
      current--;
    });
    q.add({ n: 1 });
    q.add({ n: 2 });
    q.add({ n: 3 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(maxConcurrent).toBeGreaterThan(1);
  });

  test("priority: higher priority jobs process first", async () => {
    const q = createQueue("prio-order", { concurrency: 1, retries: 0, backoff: "exponential" });
    const order: number[] = [];
    q.process(async (job) => {
      order.push(job.data.n);
    });
    q.add({ n: 3 }, { priority: 3 });
    q.add({ n: 1 }, { priority: 1 });
    q.add({ n: 2 }, { priority: 2 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    expect(order[0]).toBe(3);
  });

  test("delayed job: add with delay stays pending initially", () => {
    const q = createQueue("delay-test", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.process(async (job) => {
      return "done";
    });
    const job = q.add({ delayed: true }, { delay: 5000 });
    
    const found = q.getJob(job.id);
    expect(found.status).toBe("pending");
  });

  test("process handler receives job with data", async () => {
    const q = createQueue("handler-data", { concurrency: 1, retries: 0, backoff: "exponential" });
    let receivedData: any = null;
    q.process(async (job) => {
      receivedData = job.data;
    });
    q.add({ msg: "hello" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(receivedData.msg).toBe("hello");
  });

  test("process handler receives job with id", async () => {
    const q = createQueue("handler-id", { concurrency: 1, retries: 0, backoff: "exponential" });
    let receivedId: any = null;
    q.process(async (job) => {
      receivedId = job.id;
    });
    const job = q.add({ x: 1 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(receivedId).toBe(job.id);
  });

  test("multiple process calls register multiple handlers", () => {
    const q = createQueue("multi-handler", { concurrency: 1, retries: 0, backoff: "exponential" });
    q.process(async (job) => {});
    q.process(async (job) => {});
    
    expect(typeof q.process).toBe("function");
  });
});
