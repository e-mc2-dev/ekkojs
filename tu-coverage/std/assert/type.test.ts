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
import { assertType } from "ekko:test/assert";

describe("assertType", () => {
  test('assertType("hello", "string") passes', () => {
    assertType("hello", "string");
    expect(true).toBe(true);
  });

  test('assertType(42, "number") passes', () => {
    assertType(42, "number");
    expect(true).toBe(true);
  });

  test('assertType(true, "boolean") passes', () => {
    assertType(true, "boolean");
    expect(true).toBe(true);
  });

  test('assertType({}, "object") passes', () => {
    assertType({}, "object");
    expect(true).toBe(true);
  });

  test('assertType("hello", "number") throws', () => {
    const fn = () => assertType("hello", "number");
    expect(fn).toThrow();
  });

  test('assertType(null, "string") throws', () => {
    const fn = () => assertType(null, "string");
    expect(fn).toThrow();
  });

  test('assertType(undefined, "string") throws', () => {
    const fn = () => assertType(undefined, "string");
    expect(fn).toThrow();
  });

  test('assertType([], "object") passes', () => {
    assertType([], "object");
    expect(true).toBe(true);
  });
});
