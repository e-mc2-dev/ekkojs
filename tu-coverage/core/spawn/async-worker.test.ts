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

describe("spawn async worker - basic async", () => {
  test("spawn with async function and sleep", async () => {
    const result = await Ekko.spawn(async () => {
      await Ekko.sleep(10);
      return 42;
    });
    expect(result).toBe(42);
  });

  test("spawn with async function returning a string", async () => {
    const result = await Ekko.spawn(async () => {
      await Ekko.sleep(5);
      return "async result";
    });
    expect(result).toBe("async result");
  });

  test("spawn with async function returning an object", async () => {
    const result = await Ekko.spawn(async () => {
      await Ekko.sleep(5);
      return { status: "ok", code: 200 };
    });
    expect(result).toEqual({ status: "ok", code: 200 });
  });
});

describe("spawn async worker - multiple awaits", () => {
  test("spawn with multiple sequential awaits", async () => {
    const result = await Ekko.spawn(async () => {
      await Ekko.sleep(5);
      const a = 10;
      await Ekko.sleep(5);
      const b = 20;
      await Ekko.sleep(5);
      return a + b;
    });
    expect(result).toBe(30);
  });

  test("spawn with await in a loop", async () => {
    const result = await Ekko.spawn(async () => {
      let sum = 0;
      for (let i = 0; i < 3; i++) {
        await Ekko.sleep(5);
        sum += i;
      }
      return sum;
    });
    expect(result).toBe(3);
  });
});

describe("spawn async worker - promise patterns", () => {
  test("spawn with manual Promise resolution", async () => {
    const result = await Ekko.spawn(() => {
      return new Promise<number>((resolve) => {
        setTimeout(() => resolve(99), 10);
      });
    });
    expect(result).toBe(99);
  });

  test("spawn with Promise.resolve", async () => {
    const result = await Ekko.spawn(async () => {
      const val = await Promise.resolve(77);
      return val;
    });
    expect(result).toBe(77);
  });

  test("spawn with setTimeout inside async worker", async () => {
    const result = await Ekko.spawn(() => {
      return new Promise<string>((resolve) => {
        setTimeout(() => resolve("from timeout"), 10);
      });
    });
    expect(result).toBe("from timeout");
  });
});
