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
import { z } from "ekko:web/validate";

describe("z.boolean basic", () => {
  test("parse returns true", () => {
    const result = z.boolean().parse(true);
    expect(result).toBe(true);
  });

  test("parse returns false", () => {
    const result = z.boolean().parse(false);
    expect(result).toBe(false);
  });

  test("rejects string 'true'", () => {
    const r = z.boolean().safeParse("true");
    expect(r.success).toBe(false);
  });

  test("rejects number 1", () => {
    const r = z.boolean().safeParse(1);
    expect(r.success).toBe(false);
  });

  test("rejects null", () => {
    const r = z.boolean().safeParse(null);
    expect(r.success).toBe(false);
  });

  test("rejects number 0", () => {
    const r = z.boolean().safeParse(0);
    expect(r.success).toBe(false);
  });
});

describe("z.boolean modifiers", () => {
  test("optional accepts undefined", () => {
    const result = z.boolean().optional().parse(undefined);
    expect(result).toBeUndefined();
  });

  test("nullable accepts null", () => {
    const result = z.boolean().nullable().parse(null);
    expect(result).toBeNull();
  });

  test("default(false) returns false for undefined", () => {
    const result = z.boolean().default(false).parse(undefined);
    expect(result).toBe(false);
  });
});

describe("z.boolean safeParse", () => {
  test("safeParse on true returns data === true", () => {
    const r = z.boolean().safeParse(true);
    expect(r.success).toBe(true);
    expect(r.data).toBe(true);
  });
});
