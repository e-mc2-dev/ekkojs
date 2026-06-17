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
import { assert, fail } from "ekko:test/assert";

describe("assert", () => {
  test("assert(true) does not throw", () => {
    assert(true);
    expect(true).toBe(true);
  });

  test("assert(false) throws", () => {
    const fn = () => assert(false);
    expect(fn).toThrow();
  });

  test("assert(1) does not throw (truthy)", () => {
    assert(1);
    expect(true).toBe(true);
  });

  test("assert(0) throws (falsy)", () => {
    const fn = () => assert(0);
    expect(fn).toThrow();
  });

  test('assert("") throws (falsy)', () => {
    const fn = () => assert("");
    expect(fn).toThrow();
  });

  test("assert with custom message", () => {
    let msg = "";
    try {
      assert(false, "custom error message");
    } catch (e: any) {
      msg = e.message;
    }
    expect(msg).toBe("custom error message");
  });
});

describe("fail", () => {
  test("fail() always throws", () => {
    const fn = () => fail("intentional failure");
    expect(fn).toThrow();
  });

  test("fail throws AssertionError", () => {
    let name = "";
    try {
      fail("nope");
    } catch (e: any) {
      name = e.name;
    }
    expect(name).toBe("AssertionError");
  });
});
