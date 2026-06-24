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

describe("Ekko.parallel - basic", () => {
  test("returns results from 3 functions", async () => {
    const results = await Ekko.parallel([() => 1, () => 2, () => 3]);
    expect(results).toEqual([1, 2, 3]);
  });

  test("results are ordered same as input", async () => {
    const results = await Ekko.parallel([() => "a", () => "b", () => "c"]);
    expect(results[0]).toBe("a");
    expect(results[1]).toBe("b");
    expect(results[2]).toBe("c");
  });

  test("mixed return types (number, string, boolean)", async () => {
    const results = await Ekko.parallel([() => 42, () => "hello", () => true]);
    expect(results[0]).toBe(42);
    expect(results[1]).toBe("hello");
    expect(results[2]).toBe(true);
  });

  test("parallel with 2 functions", async () => {
    const results = await Ekko.parallel([() => 10, () => 20]);
    expect(results).toEqual([10, 20]);
    expect(results).toHaveLength(2);
  });

  test("parallel with 5 functions", async () => {
    const results = await Ekko.parallel([
      () => 1,
      () => 2,
      () => 3,
      () => 4,
      () => 5,
    ]);
    expect(results).toEqual([1, 2, 3, 4, 5]);
    expect(results).toHaveLength(5);
  });

  test("each function returns different type", async () => {
    const results = await Ekko.parallel([
      () => 99,
      () => "text",
      () => false,
      () => null,
    ]);
    expect(results[0]).toBe(99);
    expect(results[1]).toBe("text");
    expect(results[2]).toBe(false);
    expect(results[3]).toBeNull();
  });

  test("parallel with async functions", async () => {
    const results = await Ekko.parallel([
      async () => {
        await Ekko.sleep(5);
        return "done";
      },
      async () => {
        await Ekko.sleep(5);
        return "also done";
      },
    ]);
    expect(results[0]).toBe("done");
    expect(results[1]).toBe("also done");
  });

  test("parallel preserves numeric ordering", async () => {
    const results = await Ekko.parallel([
      () => 100,
      () => 200,
      () => 300,
    ]);
    expect(results[0]).toBeLessThan(results[1]);
    expect(results[1]).toBeLessThan(results[2]);
  });

  test("parallel with functions returning zero", async () => {
    const results = await Ekko.parallel([() => 0, () => 0, () => 0]);
    expect(results).toEqual([0, 0, 0]);
  });

  test("parallel with functions returning empty strings", async () => {
    const results = await Ekko.parallel([() => "", () => "x"]);
    expect(results[0]).toBe("");
    expect(results[1]).toBe("x");
  });
});
