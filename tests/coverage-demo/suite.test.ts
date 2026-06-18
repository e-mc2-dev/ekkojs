// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { test, expect, describe } from "ekko:test";
import { clamp, capitalize, sum, average } from "./utils.ts";
import { validateAge, validateEmail, validatePassword } from "./validator.ts";

describe("utils", () => {
  describe("clamp", () => {
    test("within range", () => { expect(clamp(5, 0, 10)).toBe(5); });
    test("below min", () => { expect(clamp(-5, 0, 10)).toBe(0); });
    test("above max", () => { expect(clamp(15, 0, 10)).toBe(10); });
  });

  describe("capitalize", () => {
    test("normal", () => { expect(capitalize("hello")).toBe("Hello"); });
    test("empty", () => { expect(capitalize("")).toBe(""); });
    
  });

  describe("sum", () => {
    test("numbers", () => { expect(sum([1, 2, 3])).toBe(6); });
    test("empty", () => { expect(sum([])).toBe(0); });
  });

  describe("average", () => {
    test("numbers", () => { expect(average([2, 4, 6])).toBe(4); });
    
  });
});

describe("validator", () => {
  describe("validateAge", () => {
    test("valid age", () => {
      const r = validateAge(25);
      expect(r.valid).toBe(true);
      expect(r.errors).toHaveLength(0);
    });
    test("negative age", () => {
      const r = validateAge(-5);
      expect(r.valid).toBe(false);
    });
    
  });

  describe("validateEmail", () => {
    test("valid", () => {
      const r = validateEmail("test@example.com");
      expect(r.valid).toBe(true);
    });
    test("missing @", () => {
      const r = validateEmail("invalid");
      expect(r.valid).toBe(false);
    });
    test("empty", () => {
      const r = validateEmail("");
      expect(r.valid).toBe(false);
    });
    
  });

});
