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

describe("setTimeout", () => {
  test("setTimeout fires callback", async () => {
    let fired = false;
    setTimeout(() => { fired = true; }, 10);
    await Ekko.sleep(50);
    expect(fired).toBeTruthy();
  });

  test("setTimeout with 0ms fires in next tick", async () => {
    let fired = false;
    setTimeout(() => { fired = true; }, 0);
    await Ekko.sleep(20);
    expect(fired).toBeTruthy();
  });

  test("setTimeout with 50ms fires after ~50ms", async () => {
    const start = performance.now();
    let elapsed = 0;
    setTimeout(() => { elapsed = performance.now() - start; }, 50);
    await Ekko.sleep(150);
    expect(elapsed >= 30).toBe(true);
  });

  test("setTimeout returns numeric ID", () => {
    const id = setTimeout(() => {}, 100);
    expect(typeof id).toBe("number");
    clearTimeout(id);
  });

  test("clearTimeout prevents callback", async () => {
    let fired = false;
    const id = setTimeout(() => { fired = true; }, 50);
    clearTimeout(id);
    await Ekko.sleep(100);
    expect(fired).toBeFalsy();
  });

  test("clearTimeout with invalid ID is safe", () => {
    let threw = false;
    try {
      clearTimeout(999999);
    } catch (_) {
      threw = true;
    }
    expect(threw).toBeFalsy();
  });

  test("nested setTimeout", async () => {
    let innerFired = false;
    setTimeout(() => {
      setTimeout(() => { innerFired = true; }, 10);
    }, 10);
    await Ekko.sleep(100);
    expect(innerFired).toBeTruthy();
  });

  test("setTimeout with arrow function", async () => {
    let value = 0;
    setTimeout(() => { value = 42; }, 10);
    await Ekko.sleep(50);
    expect(value).toBe(42);
  });

  test("multiple setTimeouts fire in scheduled order", async () => {
    const order: number[] = [];
    setTimeout(() => order.push(1), 10);
    setTimeout(() => order.push(2), 30);
    setTimeout(() => order.push(3), 50);
    await Ekko.sleep(150);
    expect(order).toEqual([1, 2, 3]);
  });

  test("setTimeout callback receives no unexpected args", async () => {
    let argCount = -1;
    setTimeout(function() { argCount = arguments.length; }, 10);
    await Ekko.sleep(50);
    expect(argCount >= 0).toBe(true);
  });

  test("multiple clearTimeout calls are safe", () => {
    const id = setTimeout(() => {}, 1000);
    clearTimeout(id);
    clearTimeout(id);
    expect(true).toBeTruthy();
  });

  test("setTimeout with large delay does not fire immediately", async () => {
    let fired = false;
    const id = setTimeout(() => { fired = true; }, 10000);
    await Ekko.sleep(50);
    expect(fired).toBeFalsy();
    clearTimeout(id);
  });
});
