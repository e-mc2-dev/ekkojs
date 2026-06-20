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

describe("Timer ordering", () => {
  test("setTimeout(fn, 0) fires before setTimeout(fn, 100)", async () => {
    const order: string[] = [];
    setTimeout(() => order.push("fast"), 0);
    setTimeout(() => order.push("slow"), 100);
    await Ekko.sleep(200);
    expect(order[0]).toBe("fast");
    expect(order[1]).toBe("slow");
  });

  test("multiple 0ms timeouts all fire", async () => {
    const order: number[] = [];
    setTimeout(() => order.push(1), 0);
    setTimeout(() => order.push(2), 0);
    setTimeout(() => order.push(3), 0);
    await Ekko.sleep(50);
    expect(order).toHaveLength(3);
    expect(order).toContain(1);
    expect(order).toContain(2);
    expect(order).toContain(3);
  });

  test("setInterval interleaves with setTimeout", async () => {
    const events: string[] = [];
    const id = setInterval(() => events.push("interval"), 30);
    setTimeout(() => events.push("timeout"), 50);
    await Ekko.sleep(200);
    clearInterval(id);
    expect(events).toContain("interval");
    expect(events).toContain("timeout");
  });

  test("Promise.resolve fires before setTimeout(fn, 0)", async () => {
    const order: string[] = [];
    setTimeout(() => order.push("timeout"), 0);
    Promise.resolve().then(() => order.push("microtask"));
    await Ekko.sleep(50);
    expect(order[0]).toBe("microtask");
    expect(order[1]).toBe("timeout");
  });

  test("shorter delay fires before longer delay", async () => {
    const order: string[] = [];
    setTimeout(() => order.push("200ms"), 200);
    setTimeout(() => order.push("50ms"), 50);
    setTimeout(() => order.push("10ms"), 10);
    await Ekko.sleep(300);
    expect(order[0]).toBe("10ms");
    expect(order[1]).toBe("50ms");
    expect(order[2]).toBe("200ms");
  });

  test("cleared timeout does not affect ordering of others", async () => {
    const order: number[] = [];
    setTimeout(() => order.push(1), 10);
    const id = setTimeout(() => order.push(2), 20);
    setTimeout(() => order.push(3), 30);
    clearTimeout(id);
    await Ekko.sleep(100);
    expect(order).toEqual([1, 3]);
  });

  test("microtasks resolve before macrotasks in chain", async () => {
    const order: string[] = [];
    setTimeout(() => {
      order.push("macro");
      Promise.resolve().then(() => order.push("micro-in-macro"));
    }, 10);
    await Ekko.sleep(50);
    expect(order[0]).toBe("macro");
    expect(order[1]).toBe("micro-in-macro");
  });

  test("nested setTimeout ordering", async () => {
    const order: number[] = [];
    setTimeout(() => {
      order.push(1);
      setTimeout(() => order.push(2), 10);
    }, 10);
    setTimeout(() => order.push(3), 30);
    await Ekko.sleep(100);
    expect(order[0]).toBe(1);
    
    expect(order).toContain(2);
    expect(order).toContain(3);
  });
});
