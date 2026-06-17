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
import { assertEqual, assertNotEqual, assertStrictEqual, assertDeepEqual } from "ekko:test/assert";

describe("assertEqual", () => {
  test("assertEqual(1, 1) passes", () => {
    assertEqual(1, 1);
    expect(true).toBe(true);
  });

  test("assertEqual(1, 2) throws", () => {
    const fn = () => assertEqual(1, 2);
    expect(fn).toThrow();
  });

  test('assertEqual("a", "a") passes', () => {
    assertEqual("a", "a");
    expect(true).toBe(true);
  });
});

describe("assertNotEqual", () => {
  test("assertNotEqual(1, 2) passes", () => {
    assertNotEqual(1, 2);
    expect(true).toBe(true);
  });

  test("assertNotEqual(1, 1) throws", () => {
    const fn = () => assertNotEqual(1, 1);
    expect(fn).toThrow();
  });
});

describe("assertStrictEqual", () => {
  test('assertStrictEqual("a", "a") passes', () => {
    assertStrictEqual("a", "a");
    expect(true).toBe(true);
  });

  test("assertStrictEqual(42, 42) passes", () => {
    assertStrictEqual(42, 42);
    expect(true).toBe(true);
  });

  test('assertStrictEqual(1, "1") throws on type mismatch', () => {
    const fn = () => assertStrictEqual(1, "1");
    expect(fn).toThrow();
  });
});

describe("assertDeepEqual", () => {
  test("assertDeepEqual({a:1}, {a:1}) passes", () => {
    assertDeepEqual({ a: 1 }, { a: 1 });
    expect(true).toBe(true);
  });

  test("assertDeepEqual({a:1}, {a:2}) throws", () => {
    const fn = () => assertDeepEqual({ a: 1 }, { a: 2 });
    expect(fn).toThrow();
  });

  test("assertDeepEqual([1,2], [1,2]) passes", () => {
    assertDeepEqual([1, 2], [1, 2]);
    expect(true).toBe(true);
  });

  test("assertDeepEqual nested objects", () => {
    assertDeepEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] });
    expect(true).toBe(true);
  });

  test("assertDeepEqual([1,2], [1,3]) throws", () => {
    const fn = () => assertDeepEqual([1, 2], [1, 3]);
    expect(fn).toThrow();
  });
});
