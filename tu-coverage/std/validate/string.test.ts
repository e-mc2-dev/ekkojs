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

describe("z.string", () => {
  test("parse returns valid string", () => {
    const result = z.string().parse("hello");
    expect(result).toBe("hello");
  });

  test("rejects number", () => {
    const r = z.string().safeParse(42);
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });

  test("rejects null", () => {
    const r = z.string().safeParse(null);
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });

  test("rejects undefined", () => {
    const r = z.string().safeParse(undefined);
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });

  test("rejects boolean", () => {
    const r = z.string().safeParse(true);
    expect(r.success).toBe(false);
  });

  test("rejects object", () => {
    const r = z.string().safeParse({});
    expect(r.success).toBe(false);
  });
});

describe("z.string().min", () => {
  test("min(3) accepts string of length 3", () => {
    const result = z.string().min(3).parse("abc");
    expect(result).toBe("abc");
  });

  test("min(3) rejects string of length 2", () => {
    const r = z.string().min(3).safeParse("ab");
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });
});

describe("z.string().max", () => {
  test("max(5) accepts string of length 5", () => {
    const result = z.string().max(5).parse("abcde");
    expect(result).toBe("abcde");
  });

  test("max(5) rejects string of length 6", () => {
    const r = z.string().max(5).safeParse("abcdef");
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });
});

describe("z.string().min().max()", () => {
  test("min(2).max(10) accepts valid string", () => {
    const result = z.string().min(2).max(10).parse("hello");
    expect(result).toBe("hello");
  });
});

describe("z.string().email", () => {
  test("accepts valid email", () => {
    const result = z.string().email().parse("user@example.com");
    expect(result).toBe("user@example.com");
  });

  test("rejects invalid email without @", () => {
    const r = z.string().email().safeParse("invalid");
    expect(r.success).toBe(false);
  });

  test("rejects email without dot in domain", () => {
    const r = z.string().email().safeParse("no@dot");
    expect(r.success).toBe(false);
  });
});

describe("z.string().url", () => {
  test("accepts valid https url", () => {
    const result = z.string().url().parse("https://example.com");
    expect(result).toBe("https://example.com");
  });

  test("rejects non-url string", () => {
    const r = z.string().url().safeParse("not-a-url");
    expect(r.success).toBe(false);
  });
});

describe("z.string().uuid", () => {
  test("accepts valid uuid", () => {
    const result = z.string().uuid().parse("550e8400-e29b-41d4-a716-446655440000");
    expect(result).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  test("rejects invalid uuid", () => {
    const r = z.string().uuid().safeParse("not-uuid");
    expect(r.success).toBe(false);
  });
});

describe("z.string().regex", () => {
  test("accepts matching pattern", () => {
    const result = z.string().regex(/^\d+$/).parse("123");
    expect(result).toBe("123");
  });

  test("rejects non-matching pattern", () => {
    const r = z.string().regex(/^\d+$/).safeParse("abc");
    expect(r.success).toBe(false);
  });
});

describe("z.string().nonempty", () => {
  test("accepts non-empty string", () => {
    const result = z.string().nonempty().parse("a");
    expect(result).toBe("a");
  });

  test("rejects empty string", () => {
    const r = z.string().nonempty().safeParse("");
    expect(r.success).toBe(false);
  });
});

describe("z.string().trim", () => {
  test("trims whitespace from both sides", () => {
    const result = z.string().trim().parse("  hello  ");
    expect(result).toBe("hello");
  });
});

describe("z.string modifiers", () => {
  test("optional accepts undefined", () => {
    const result = z.string().optional().parse(undefined);
    expect(result).toBeUndefined();
  });

  test("nullable accepts null", () => {
    const result = z.string().nullable().parse(null);
    expect(result).toBeNull();
  });
});
