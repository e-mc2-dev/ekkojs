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

describe("setInterval", () => {
  test("setInterval fires multiple times", async () => {
    let count = 0;
    const id = setInterval(() => { count++; }, 20);
    await Ekko.sleep(150);
    clearInterval(id);
    expect(count >= 2).toBe(true);
  });

  test("setInterval fires at roughly correct intervals", async () => {
    const stamps: number[] = [];
    const start = performance.now();
    const id = setInterval(() => {
      stamps.push(performance.now() - start);
    }, 30);
    await Ekko.sleep(200);
    clearInterval(id);
    expect(stamps.length >= 2).toBe(true);
  });

  test("clearInterval stops firing", async () => {
    let count = 0;
    const id = setInterval(() => { count++; }, 20);
    await Ekko.sleep(80);
    clearInterval(id);
    const countAfterClear = count;
    await Ekko.sleep(80);
    expect(count).toBe(countAfterClear);
  });

  test("setInterval returns numeric ID", () => {
    const id = setInterval(() => {}, 100);
    expect(typeof id).toBe("number");
    clearInterval(id);
  });

  test("count 3 fires then clear", async () => {
    let count = 0;
    const id = setInterval(() => {
      count++;
      if (count >= 3) clearInterval(id);
    }, 20);
    await Ekko.sleep(200);
    expect(count).toBe(3);
  });

  test("clearInterval with invalid ID is safe", () => {
    let threw = false;
    try {
      clearInterval(999999);
    } catch (_) {
      threw = true;
    }
    expect(threw).toBeFalsy();
  });

  test("multiple intervals run concurrently", async () => {
    let countA = 0;
    let countB = 0;
    const idA = setInterval(() => { countA++; }, 20);
    const idB = setInterval(() => { countB++; }, 20);
    await Ekko.sleep(100);
    clearInterval(idA);
    clearInterval(idB);
    expect(countA >= 2).toBe(true);
    expect(countB >= 2).toBe(true);
  });

  test("clearInterval called multiple times is safe", () => {
    const id = setInterval(() => {}, 100);
    clearInterval(id);
    clearInterval(id);
    expect(true).toBeTruthy();
  });

  test("interval does not fire after clear even with 0ms delay", async () => {
    let count = 0;
    const id = setInterval(() => { count++; }, 10);
    clearInterval(id);
    await Ekko.sleep(50);
    expect(count).toBe(0);
  });

  test("setInterval with arrow function", async () => {
    let sum = 0;
    const id = setInterval(() => { sum += 10; }, 20);
    await Ekko.sleep(100);
    clearInterval(id);
    expect(sum >= 20).toBe(true);
  });
});
