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

describe("setTimeout advanced", () => {
  test("setTimeout returns different IDs for each call", () => {
    const id1 = setTimeout(() => {}, 5000);
    const id2 = setTimeout(() => {}, 5000);
    const id3 = setTimeout(() => {}, 5000);
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    clearTimeout(id1);
    clearTimeout(id2);
    clearTimeout(id3);
  });

  test("clearTimeout on non-existent ID is safe", () => {
    let threw = false;
    try {
      clearTimeout(999888777);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  test("setTimeout with 0 fires before setTimeout with 100", async () => {
    const order: number[] = [];
    setTimeout(() => order.push(1), 0);
    setTimeout(() => order.push(2), 100);
    await Ekko.sleep(250);
    expect(order[0]).toBe(1);
    expect(order[1]).toBe(2);
  });

  test("nested setTimeout chain (A schedules B, B schedules C)", async () => {
    const order: string[] = [];
    setTimeout(() => {
      order.push("A");
      setTimeout(() => {
        order.push("B");
        setTimeout(() => {
          order.push("C");
        }, 10);
      }, 10);
    }, 10);
    await Ekko.sleep(200);
    expect(order).toEqual(["A", "B", "C"]);
  });

  test("many simultaneous timers (20+) all fire", async () => {
    let count = 0;
    for (let i = 0; i < 25; i++) {
      setTimeout(() => { count++; }, 10);
    }
    await Ekko.sleep(200);
    expect(count).toBe(25);
  });

  test("timer callback can schedule new timer", async () => {
    let finalValue = 0;
    setTimeout(() => {
      finalValue = 1;
      setTimeout(() => {
        finalValue = 2;
      }, 10);
    }, 10);
    await Ekko.sleep(150);
    expect(finalValue).toBe(2);
  });
});

describe("setInterval advanced", () => {
  test("setInterval fires at least 3 times in 500ms with 100ms interval", async () => {
    let count = 0;
    const id = setInterval(() => { count++; }, 100);
    await Ekko.sleep(500);
    clearInterval(id);
    expect(count >= 3).toBe(true);
  });

  test("clearInterval inside interval callback stops it", async () => {
    let count = 0;
    const id = setInterval(() => {
      count++;
      if (count >= 3) clearInterval(id);
    }, 30);
    await Ekko.sleep(300);
    expect(count).toBe(3);
  });

  test("setTimeout inside setInterval callback works", async () => {
    let timeoutFired = false;
    let intervalCount = 0;
    const id = setInterval(() => {
      intervalCount++;
      if (intervalCount === 2) {
        setTimeout(() => { timeoutFired = true; }, 10);
        clearInterval(id);
      }
    }, 30);
    await Ekko.sleep(300);
    expect(intervalCount).toBe(2);
    expect(timeoutFired).toBe(true);
  });
});

describe("Ekko.sleep timing", () => {
  test("Ekko.sleep(100) takes approximately 100ms (80-300ms tolerance)", async () => {
    const start = performance.now();
    await Ekko.sleep(100);
    const elapsed = performance.now() - start;
    expect(elapsed >= 80).toBe(true);
    expect(elapsed < 300).toBe(true);
  });
});
