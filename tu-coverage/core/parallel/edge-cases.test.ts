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

describe("Ekko.parallel - edge cases", () => {
  test("single function returns wrapped in array", async () => {
    const results = await Ekko.parallel([() => 42]);
    expect(results).toEqual([42]);
    expect(results).toHaveLength(1);
  });

  test("empty array returns empty array", async () => {
    const results = await Ekko.parallel([]);
    expect(results).toEqual([]);
    expect(results).toHaveLength(0);
  });

  test("functions returning objects", async () => {
    const results = await Ekko.parallel([
      () => ({ name: "Alice" }),
      () => ({ name: "Bob" }),
    ]);
    expect(results[0]).toEqual({ name: "Alice" });
    expect(results[1]).toEqual({ name: "Bob" });
  });

  test("functions returning arrays", async () => {
    const results = await Ekko.parallel([
      () => [1, 2, 3],
      () => ["a", "b"],
    ]);
    expect(results[0]).toEqual([1, 2, 3]);
    expect(results[1]).toEqual(["a", "b"]);
  });

  test("functions returning null", async () => {
    const results = await Ekko.parallel([() => null, () => null]);
    expect(results[0]).toBeNull();
    expect(results[1]).toBeNull();
  });

  test("functions returning undefined", async () => {
    const results = await Ekko.parallel([() => undefined, () => undefined]);
    expect(results[0] == null).toBe(true);
    expect(results[1] == null).toBe(true);
  });

  test("functions returning nested objects", async () => {
    const results = await Ekko.parallel([
      () => ({ a: { b: { c: 1 } } }),
    ]);
    expect(results[0]).toHaveProperty("a");
    expect(results[0].a.b.c).toBe(1);
  });

  test("functions returning mixed null and values", async () => {
    const results = await Ekko.parallel([
      () => null,
      () => 42,
      () => undefined,
      () => "ok",
    ]);
    expect(results[0] == null).toBe(true);
    expect(results[1]).toBe(42);
    expect(results[2] == null).toBe(true);
    expect(results[3]).toBe("ok");
  });
});
