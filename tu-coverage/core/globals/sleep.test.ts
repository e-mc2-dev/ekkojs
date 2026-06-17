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

describe("Ekko.sleep", () => {
  test("Ekko.sleep(10) resolves without hanging", async () => {
    await Ekko.sleep(10);
    expect(true).toBeTruthy();
  });

  test("Ekko.sleep(0) resolves immediately", async () => {
    const before = performance.now();
    await Ekko.sleep(0);
    const after = performance.now();
    expect(after - before).toBeLessThan(50);
  });

  test("after Ekko.sleep(50), at least 40ms elapsed", async () => {
    const before = performance.now();
    await Ekko.sleep(50);
    const elapsed = performance.now() - before;
    expect(elapsed >= 40).toBe(true);
  });

  test("Ekko.sleep returns a promise", () => {
    const result = Ekko.sleep(1);
    expect(result).toBeTruthy();
    expect(typeof result.then).toBe("function");
  });
});
