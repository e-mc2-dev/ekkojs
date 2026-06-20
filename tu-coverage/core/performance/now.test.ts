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

describe("performance.now", () => {
  test("returns a number", () => {
    const val = performance.now();
    expect(typeof val).toBe("number");
  });

  test("returns value greater than 0", () => {
    const val = performance.now();
    expect(val).toBeGreaterThan(0);
  });

  test("second call is >= first", () => {
    const a = performance.now();
    const b = performance.now();
    expect(b >= a).toBe(true);
  });

  test("after Ekko.sleep(10), difference is >= 8ms", async () => {
    const before = performance.now();
    await Ekko.sleep(10);
    const after = performance.now();
    expect(after - before >= 8).toBe(true);
  });

  test("typeof is number", () => {
    expect(typeof performance.now()).toBe("number");
  });
});
