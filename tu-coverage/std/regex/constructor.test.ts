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
import { Regex } from "ekko:text/regex";

describe("Regex constructor", () => {
  test("creates regex from simple pattern", () => {
    const re = Regex("abc");
    expect(re).toBeTruthy();
    re.dispose();
  });

  test("creates regex for digit matching", () => {
    const re = Regex("\\d+");
    expect(re).toBeTruthy();
    expect(re.test("123")).toBe(true);
    re.dispose();
  });

  test("creates regex with case insensitive flag", () => {
    const re = Regex("hello", "i");
    expect(re.test("HELLO")).toBe(true);
    expect(re.test("Hello")).toBe(true);
    re.dispose();
  });

  test("regex has test method", () => {
    const re = Regex("abc");
    expect(typeof re.test).toBe("function");
    re.dispose();
  });

  test("regex has match method", () => {
    const re = Regex("abc");
    expect(typeof re.match).toBe("function");
    re.dispose();
  });

  test("invalid pattern throws", () => {
    const fn = () => Regex("[invalid");
    expect(fn).toThrow();
  });
});
