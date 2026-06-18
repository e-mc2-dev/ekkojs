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

describe("performance marks and measures", () => {
  test("performance.mark does not throw", () => {
    let threw = false;
    try { performance.mark("test-mark"); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("performance.measure after marks", async () => {
    performance.mark("m-start");
    await Ekko.sleep(10);
    performance.mark("m-end");
    let threw = false;
    try {
      performance.measure("m-duration", "m-start", "m-end");
    } catch (_) {
      threw = true;
    }
    expect(threw).toBeFalsy();
  });

  test("getEntriesByName returns entries", () => {
    performance.mark("named-mark");
    const entries = performance.getEntriesByName("named-mark");
    expect(entries.length).toBeGreaterThan(0);
  });

  test("getEntriesByType mark returns marks", () => {
    performance.mark("type-mark");
    const marks = performance.getEntriesByType("mark");
    expect(marks.length).toBeGreaterThan(0);
  });

  test("getEntriesByType measure returns measures", async () => {
    performance.mark("measure-start");
    await Ekko.sleep(5);
    performance.mark("measure-end");
    performance.measure("my-measure", "measure-start", "measure-end");
    const measures = performance.getEntriesByType("measure");
    expect(measures.length).toBeGreaterThan(0);
  });

  test("measure has duration >= 0", async () => {
    performance.mark("dur-start");
    await Ekko.sleep(5);
    performance.mark("dur-end");
    performance.measure("dur-measure", "dur-start", "dur-end");
    const entries = performance.getEntriesByName("dur-measure");
    expect(entries[0].duration >= 0).toBe(true);
  });

  test("mark entry has name property", () => {
    performance.mark("prop-mark");
    const entries = performance.getEntriesByName("prop-mark");
    expect(entries[0]).toHaveProperty("name");
    expect(entries[0].name).toBe("prop-mark");
  });

  test("mark entry has startTime", () => {
    performance.mark("time-mark");
    const entries = performance.getEntriesByName("time-mark");
    expect(entries[0]).toHaveProperty("startTime");
    expect(entries[0].startTime >= 0).toBe(true);
  });
});
