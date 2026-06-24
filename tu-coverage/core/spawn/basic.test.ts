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

describe("spawn basics - primitive return values", () => {
  test("spawn returning a number", async () => {
    const result = await Ekko.spawn(() => 42);
    expect(result).toBe(42);
  });

  test("spawn returning a string", async () => {
    const result = await Ekko.spawn(() => "hello");
    expect(result).toBe("hello");
  });

  test("spawn returning a boolean true", async () => {
    const result = await Ekko.spawn(() => true);
    expect(result).toBe(true);
  });

  test("spawn returning a boolean false", async () => {
    const result = await Ekko.spawn(() => false);
    expect(result).toBe(false);
  });

  test("spawn returning null", async () => {
    const result = await Ekko.spawn(() => null);
    expect(result).toBeNull();
  });

  test("spawn returning undefined (no return)", async () => {
    const result = await Ekko.spawn(() => {});
    expect(result == null).toBe(true);
  });
});

describe("spawn basics - complex return values", () => {
  test("spawn returning an object", async () => {
    const result = await Ekko.spawn(() => ({ name: "Alice", age: 30 }));
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  test("spawn returning an array", async () => {
    const result = await Ekko.spawn(() => [1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  test("spawn returning a nested object", async () => {
    const result = await Ekko.spawn(() => ({
      user: { name: "Bob", scores: [10, 20, 30] },
    }));
    expect(result).toEqual({ user: { name: "Bob", scores: [10, 20, 30] } });
  });
});

describe("spawn basics - function expression styles", () => {
  test("spawn with arrow function", async () => {
    const result = await Ekko.spawn(() => 99);
    expect(result).toBe(99);
  });

  test("spawn with function expression", async () => {
    const result = await Ekko.spawn(function () {
      return 88;
    });
    expect(result).toBe(88);
  });
});
