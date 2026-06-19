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

describe("Ekko.parallel - stress", () => {
  test("parallel with 10 functions", async () => {
    const results = await Ekko.parallel([
      () => 0, () => 1, () => 2, () => 3, () => 4,
      () => 5, () => 6, () => 7, () => 8, () => 9,
    ]);
    expect(results).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(results[i]).toBe(i);
    }
  });

  test("parallel with 20 functions", async () => {
    const results = await Ekko.parallel([
      () => 0, () => 2, () => 4, () => 6, () => 8,
      () => 10, () => 12, () => 14, () => 16, () => 18,
      () => 20, () => 22, () => 24, () => 26, () => 28,
      () => 30, () => 32, () => 34, () => 36, () => 38,
    ]);
    expect(results).toHaveLength(20);
  });

  test("each function does light arithmetic", async () => {
    const results = await Ekko.parallel([
      () => 0 + 100, () => 1 + 100, () => 2 + 100, () => 3 + 100, () => 4 + 100,
      () => 5 + 100, () => 6 + 100, () => 7 + 100, () => 8 + 100, () => 9 + 100,
    ]);
    for (let i = 0; i < 10; i++) {
      expect(results[i]).toBe(i + 100);
    }
  });

  test("verify all 20 results correct and ordered", async () => {
    const results = await Ekko.parallel([
      () => 0, () => 1, () => 2, () => 3, () => 4,
      () => 5, () => 6, () => 7, () => 8, () => 9,
      () => 10, () => 11, () => 12, () => 13, () => 14,
      () => 15, () => 16, () => 17, () => 18, () => 19,
    ]);
    for (let i = 0; i < 20; i++) {
      expect(results[i]).toBe(i);
    }
  });

  test("parallel with staggered sleeps all complete", async () => {
    const results = await Ekko.parallel([
      async () => { await Ekko.sleep(10); return "a"; },
      async () => { await Ekko.sleep(5); return "b"; },
      async () => { await Ekko.sleep(15); return "c"; },
    ]);
    expect(results).toEqual(["a", "b", "c"]);
  });

  test("parallel with 20 async functions", async () => {
    const results = await Ekko.parallel([
      async () => { await Ekko.sleep(1); return 0; },
      async () => { await Ekko.sleep(1); return 1; },
      async () => { await Ekko.sleep(1); return 2; },
      async () => { await Ekko.sleep(1); return 3; },
      async () => { await Ekko.sleep(1); return 4; },
      async () => { await Ekko.sleep(1); return 5; },
      async () => { await Ekko.sleep(1); return 6; },
      async () => { await Ekko.sleep(1); return 7; },
      async () => { await Ekko.sleep(1); return 8; },
      async () => { await Ekko.sleep(1); return 9; },
      async () => { await Ekko.sleep(1); return 10; },
      async () => { await Ekko.sleep(1); return 11; },
      async () => { await Ekko.sleep(1); return 12; },
      async () => { await Ekko.sleep(1); return 13; },
      async () => { await Ekko.sleep(1); return 14; },
      async () => { await Ekko.sleep(1); return 15; },
      async () => { await Ekko.sleep(1); return 16; },
      async () => { await Ekko.sleep(1); return 17; },
      async () => { await Ekko.sleep(1); return 18; },
      async () => { await Ekko.sleep(1); return 19; },
    ]);
    expect(results).toHaveLength(20);
    expect(results[0]).toBe(0);
    expect(results[19]).toBe(19);
  });

  test("results from heavy parallel do not leak between calls", async () => {
    const r1 = await Ekko.parallel([
      () => 0, () => 1, () => 2, () => 3, () => 4,
      () => 5, () => 6, () => 7, () => 8, () => 9,
    ]);
    const r2 = await Ekko.parallel([
      () => 100, () => 101, () => 102, () => 103, () => 104,
      () => 105, () => 106, () => 107, () => 108, () => 109,
    ]);
    expect(r1[0]).toBe(0);
    expect(r2[0]).toBe(100);
  });

  test("parallel with functions returning large strings", async () => {
    const results = await Ekko.parallel([
      () => "x".repeat(100), () => "x".repeat(100), () => "x".repeat(100),
      () => "x".repeat(100), () => "x".repeat(100), () => "x".repeat(100),
      () => "x".repeat(100), () => "x".repeat(100), () => "x".repeat(100),
      () => "x".repeat(100),
    ]);
    expect(results).toHaveLength(10);
    for (const r of results) {
      expect(r).toHaveLength(100);
    }
  });
});
