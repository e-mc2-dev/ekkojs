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

describe("Timer + Promise interaction", () => {
  test("await inside setTimeout callback via spawn pattern", async () => {
    let result = "";
    const ch = new Ekko.Channel({ capacity: 1 });
    setTimeout(async () => {
      await Ekko.sleep(5);
      result = "done";
      await ch.send("signal");
    }, 10);
    await ch.recv();
    expect(result).toBe("done");
  });

  test("Promise resolves between timer ticks", async () => {
    let promiseResolved = false;
    let timerFired = false;

    const p = new Promise<void>((resolve) => {
      setTimeout(() => {
        promiseResolved = true;
        resolve();
      }, 10);
    });

    setTimeout(() => { timerFired = true; }, 50);

    await p;
    expect(promiseResolved).toBeTruthy();
    await Ekko.sleep(100);
    expect(timerFired).toBeTruthy();
  });

  test("Ekko.sleep interacts correctly with timers", async () => {
    const order: string[] = [];
    setTimeout(() => order.push("timer"), 20);
    await Ekko.sleep(50);
    order.push("after-sleep");
    expect(order).toContain("timer");
    expect(order).toContain("after-sleep");
  });

  test("async/await with setTimeout wrapping", async () => {
    const delay = (ms: number): Promise<string> =>
      new Promise((resolve) => setTimeout(() => resolve("resolved"), ms));

    const val = await delay(20);
    expect(val).toBe("resolved");
  });

  test("chained promises with timer", async () => {
    const result = await new Promise<number>((resolve) => {
      setTimeout(() => resolve(1), 10);
    }).then((v) => v + 1).then((v) => v + 1);

    expect(result).toBe(3);
  });

  test("Ekko.sleep(0) resolves before setTimeout(fn, 50)", async () => {
    const order: string[] = [];
    setTimeout(() => order.push("timeout"), 50);
    await Ekko.sleep(0);
    order.push("sleep-done");
    await Ekko.sleep(100);
    expect(order[0]).toBe("sleep-done");
  });
});
