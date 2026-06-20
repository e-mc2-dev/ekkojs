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

describe("performance accuracy", () => {
  test("sleep 50ms, measure duration is 40-200ms", async () => {
    performance.mark("acc-start");
    await Ekko.sleep(50);
    performance.mark("acc-end");
    performance.measure("acc-measure", "acc-start", "acc-end");
    const entries = performance.getEntriesByName("acc-measure");
    const duration = entries[0].duration;
    expect(duration >= 40).toBe(true);
    expect(duration <= 200).toBe(true);
  });

  test("performance.now monotonically increases in loop", () => {
    let prev = performance.now();
    for (let i = 0; i < 100; i++) {
      const current = performance.now();
      expect(current >= prev).toBe(true);
      prev = current;
    }
  });

  test("mark before/after sleep has reasonable duration", async () => {
    performance.mark("sleep-start");
    await Ekko.sleep(20);
    performance.mark("sleep-end");
    performance.measure("sleep-dur", "sleep-start", "sleep-end");
    const entries = performance.getEntriesByName("sleep-dur");
    expect(entries[0].duration >= 15).toBe(true);
  });
});
