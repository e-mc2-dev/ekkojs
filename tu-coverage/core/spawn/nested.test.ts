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

describe("spawn nested - basic nesting", () => {
  test("spawn inside spawn returns inner value", async () => {
    const result = await Ekko.spawn(async () => {
      const inner = await Ekko.spawn(() => 10);
      return inner + 5;
    });
    expect(result).toBe(15);
  });

  test("spawn inside spawn two levels deep", async () => {
    const result = await Ekko.spawn(async () => {
      const inner = await Ekko.spawn(async () => {
        const innermost = await Ekko.spawn(() => 1);
        return innermost + 1;
      });
      return inner + 1;
    });
    expect(result).toBe(3);
  });
});

describe("spawn nested - multiple children", () => {
  test("spawn that spawns 3 children and collects results", async () => {
    const result = await Ekko.spawn(async () => {
      const a = await Ekko.spawn(() => 10);
      const b = await Ekko.spawn(() => 20);
      const c = await Ekko.spawn(() => 30);
      return a + b + c;
    });
    expect(result).toBe(60);
  });

  test("spawn that spawns 3 children in parallel", async () => {
    const result = await Ekko.spawn(async () => {
      const results = await Promise.all([
        Ekko.spawn(() => "a"),
        Ekko.spawn(() => "b"),
        Ekko.spawn(() => "c"),
      ]);
      return results.join(",");
    });
    expect(result).toBe("a,b,c");
  });
});

describe("spawn nested - return value propagation", () => {
  test("nested spawn propagates complex objects", async () => {
    const result = await Ekko.spawn(async () => {
      const data = await Ekko.spawn(() => ({
        items: [1, 2, 3],
        label: "inner",
      }));
      return { ...data, label: "outer" };
    });
    expect(result).toEqual({ items: [1, 2, 3], label: "outer" });
  });

  test("nested spawn error propagates to parent", async () => {
    let caught = false;
    try {
      await Ekko.spawn(async () => {
        await Ekko.spawn(() => {
          throw new Error("nested failure");
        });
      });
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });
});
