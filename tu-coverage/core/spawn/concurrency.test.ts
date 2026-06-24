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

describe("spawn concurrency - simultaneous workers", () => {
  test("spawn 5 workers simultaneously and collect results", async () => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(Ekko.spawn((idx: number) => idx * 10, [i]));
    }
    const results = await Promise.all(promises);
    expect(results).toEqual([0, 10, 20, 30, 40]);
  });

  test("spawn 10 workers simultaneously", async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(Ekko.spawn((idx: number) => idx, [i]));
    }
    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(results[i]).toBe(i);
    }
  });

  test("each worker returns a unique value", async () => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(Ekko.spawn((idx: number) => `worker-${idx}`, [i]));
    }
    const results = await Promise.all(promises);
    const unique = new Set(results);
    expect(unique.size).toBe(5);
  });

  test("workers with different return types", async () => {
    const results = await Promise.all([
      Ekko.spawn(() => 42),
      Ekko.spawn(() => "text"),
      Ekko.spawn(() => true),
      Ekko.spawn(() => [1, 2]),
      Ekko.spawn(() => ({ key: "val" })),
    ]);
    expect(results[0]).toBe(42);
    expect(results[1]).toBe("text");
    expect(results[2]).toBe(true);
    expect(results[3]).toEqual([1, 2]);
    expect(results[4]).toEqual({ key: "val" });
  });
});

describe("spawn concurrency - staggered sleeps", () => {
  test("workers with staggered sleeps all complete", async () => {
    const results = await Promise.all([
      Ekko.spawn(async () => { await Ekko.sleep(30); return "slow"; }),
      Ekko.spawn(async () => { await Ekko.sleep(10); return "fast"; }),
      Ekko.spawn(async () => { await Ekko.sleep(20); return "medium"; }),
    ]);
    expect(results).toContain("slow");
    expect(results).toContain("fast");
    expect(results).toContain("medium");
  });

  test("staggered workers return in spawn order not completion order", async () => {
    const results = await Promise.all([
      Ekko.spawn(async () => { await Ekko.sleep(30); return 1; }),
      Ekko.spawn(async () => { await Ekko.sleep(10); return 2; }),
      Ekko.spawn(async () => { await Ekko.sleep(20); return 3; }),
    ]);
    
    expect(results[0]).toBe(1);
    expect(results[1]).toBe(2);
    expect(results[2]).toBe(3);
  });
});

describe("spawn concurrency - accumulation", () => {
  test("spawn workers that each compute a partial sum", async () => {
    const promises = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(Ekko.spawn((n: number) => {
        let sum = 0;
        for (let j = 1; j <= n; j++) sum += j;
        return sum;
      }, [i]));
    }
    const results = await Promise.all(promises);
    
    expect(results).toEqual([1, 3, 6, 10, 15]);
  });

  test("total sum from concurrent workers", async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(Ekko.spawn((x: number) => x, [i]));
    }
    const results = await Promise.all(promises);
    const total = results.reduce((a: number, b: number) => a + b, 0);
    expect(total).toBe(45);
  });
});
