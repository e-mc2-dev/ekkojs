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

describe("spawn heapLimit - sufficient limit", () => {
  test("spawn with generous heapLimit completes", async () => {
    const result = await Ekko.spawn(() => {
      const arr = [1, 2, 3, 4, 5];
      return arr.reduce((a, b) => a + b, 0);
    }, { heapLimit: 64 * 1024 * 1024, timeout: 10000 });
    expect(result).toBe(15);
  });

  test("spawn with heapLimit and moderate allocation completes", async () => {
    const result = await Ekko.spawn(() => {
      const data: number[] = [];
      for (let i = 0; i < 100; i++) data.push(i);
      return data.length;
    }, { heapLimit: 64 * 1024 * 1024, timeout: 10000 });
    expect(result).toBe(100);
  });
});

describe("spawn heapLimit - exceeded", () => {
  test("spawn with very small heapLimit on allocation throws memory error", async () => {
    let caught = false;
    let errorMessage = "";
    try {
      await Ekko.spawn(() => {
        const arrays: number[][] = [];
        
        for (let i = 0; i < 1000000; i++) {
          arrays.push(new Array(1000).fill(i));
        }
        return arrays.length;
      }, { heapLimit: 1024 * 1024 });
    } catch (e: any) {
      caught = true;
      errorMessage = e.message || String(e);
    }
    expect(caught).toBe(true);
  });
});

describe("spawn heapLimit - without option", () => {
  test("spawn without heapLimit uses default and completes", async () => {
    const result = await Ekko.spawn(() => {
      return "no heap limit set";
    });
    expect(result).toBe("no heap limit set");
  });

  test("spawn with heapLimit and timeout together", async () => {
    const result = await Ekko.spawn(() => {
      return 100;
    }, { heapLimit: 64 * 1024 * 1024, timeout: 5000 });
    expect(result).toBe(100);
  });
});
