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
import { capitalize, truncate } from "../src/strings/format.ts";

import { isEmail } from "../src/strings/validate.ts";

describe("format", () => {
  test("capitalize normal", () => { expect(capitalize("hello")).toBe("Hello"); });
  test("capitalize empty", () => { expect(capitalize("")).toBe(""); });
  test("truncate short", () => { expect(truncate("hi", 10)).toBe("hi"); });
  test("truncate long", () => { expect(truncate("hello world foo", 8)).toBe("hello..."); });
  
});

describe("validate", () => {
  test("valid email", () => { expect(isEmail("a@b.com")).toBe(true); });
  test("invalid email", () => { expect(isEmail("nope")).toBe(false); });
  test("empty email", () => { expect(isEmail("")).toBe(false); });
  
});
