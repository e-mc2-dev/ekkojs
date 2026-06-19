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

describe("z.enum", () => {
  test("accepts valid enum value", () => {
    const result = z.enum(["admin", "user", "mod"]).parse("admin");
    expect(result).toBe("admin");
  });

  test("rejects invalid enum value", () => {
    const r = z.enum(["admin", "user"]).safeParse("hacker");
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });

  test("safeParse returns false for missing value", () => {
    const r = z.enum(["a", "b", "c"]).safeParse("d");
    expect(r.success).toBe(false);
  });

  test("safeParse returns data on valid value", () => {
    const r = z.enum(["a", "b"]).safeParse("a");
    expect(r.success).toBe(true);
    expect(r.data).toBe("a");
  });

  test("error message contains allowed values", () => {
    const r = z.enum(["admin", "user"]).safeParse("bad");
    expect(r.success).toBe(false);
    const msg = r.error.issues[0].message;
    expect(msg).toContain("admin");
    expect(msg).toContain("user");
  });

  test("optional enum accepts undefined", () => {
    const result = z.enum(["a", "b"]).optional().parse(undefined);
    expect(result).toBeUndefined();
  });

  test("enum used as object field", () => {
    const schema = z.object({
      role: z.enum(["admin", "user"]),
    });
    const result = schema.parse({ role: "admin" });
    expect(result.role).toBe("admin");
  });
});

describe("z.literal string", () => {
  test("accepts matching string literal", () => {
    const result = z.literal("hello").parse("hello");
    expect(result).toBe("hello");
  });

  test("rejects non-matching string literal", () => {
    const r = z.literal("hello").safeParse("world");
    expect(r.success).toBe(false);
  });
});

describe("z.literal number", () => {
  test("accepts matching number literal", () => {
    const result = z.literal(42).parse(42);
    expect(result).toBe(42);
  });

  test("rejects non-matching number literal", () => {
    const r = z.literal(42).safeParse(43);
    expect(r.success).toBe(false);
  });
});

describe("z.literal boolean", () => {
  test("accepts matching boolean true", () => {
    const result = z.literal(true).parse(true);
    expect(result).toBe(true);
  });

  test("rejects non-matching boolean", () => {
    const r = z.literal(true).safeParse(false);
    expect(r.success).toBe(false);
  });
});

describe("z.literal null", () => {
  test("literal null with nullable accepts null", () => {
    const result = z.literal(null).nullable().parse(null);
    expect(result).toBeNull();
  });
});
