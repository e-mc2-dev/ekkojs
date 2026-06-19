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

describe("spawn timeout - completes in time", () => {
  test("spawn with generous timeout completes successfully", async () => {
    const result = await Ekko.spawn(() => {
      return 42;
    }, { timeout: 5000 });
    expect(result).toBe(42);
  });

  test("spawn with timeout and sleep completes when within limit", async () => {
    const result = await Ekko.spawn(async () => {
      await Ekko.sleep(10);
      return "done";
    }, { timeout: 5000 });
    expect(result).toBe("done");
  });

  test("spawn with timeout and computation completes", async () => {
    const result = await Ekko.spawn(() => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += i;
      return sum;
    }, { timeout: 5000 });
    expect(result).toBe(499500);
  });
});

describe("spawn timeout - exceeds limit", () => {
  test("spawn with timeout that exceeds throws timed out error", async () => {
    let caught = false;
    let errorMessage = "";
    try {
      await Ekko.spawn(() => {
        while (true) {}
      }, { timeout: 50 });
    } catch (e: any) {
      caught = true;
      errorMessage = e.message || String(e);
    }
    expect(caught).toBe(true);
    expect(errorMessage.toLowerCase()).toContain("timed out");
  });

  test("spawn with very short timeout (10ms) on busy work throws", async () => {
    let caught = false;
    try {
      await Ekko.spawn(() => {
        while (true) {}
      }, { timeout: 10 });
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("spawn with short timeout on sleep exceeding it throws", async () => {
    let caught = false;
    try {
      await Ekko.spawn(async () => {
        await Ekko.sleep(10000);
        return "should not reach";
      }, { timeout: 50 });
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });
});

describe("spawn timeout - zero timeout", () => {
  test("spawn with 0 timeout on instant return", async () => {

    let result: unknown = undefined;
    let caught = false;
    try {
      result = await Ekko.spawn(() => 1, { timeout: 0 });
    } catch (e) {
      caught = true;
    }
    
    expect(caught || result === 1).toBe(true);
  });

  test("spawn without timeout option does not timeout on fast work", async () => {
    const result = await Ekko.spawn(() => "no timeout set");
    expect(result).toBe("no timeout set");
  });
});
