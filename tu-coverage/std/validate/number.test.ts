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

describe("z.number basic", () => {
  test("parse returns valid integer", () => {
    const result = z.number().parse(42);
    expect(result).toBe(42);
  });

  test("parse returns valid float", () => {
    const result = z.number().parse(3.14);
    expect(result).toBe(3.14);
  });

  test("parse returns zero", () => {
    const result = z.number().parse(0);
    expect(result).toBe(0);
  });

  test("rejects string '42'", () => {
    const r = z.number().safeParse("42");
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });

  test("rejects NaN", () => {
    const r = z.number().safeParse(NaN);
    expect(r.success).toBe(false);
  });

  test("rejects null", () => {
    const r = z.number().safeParse(null);
    expect(r.success).toBe(false);
  });
});

describe("z.number().min", () => {
  test("min(5) accepts 10", () => {
    const result = z.number().min(5).parse(10);
    expect(result).toBe(10);
  });

  test("min(5) rejects 3", () => {
    const r = z.number().min(5).safeParse(3);
    expect(r.success).toBe(false);
  });
});

describe("z.number().max", () => {
  test("max(100) accepts 50", () => {
    const result = z.number().max(100).parse(50);
    expect(result).toBe(50);
  });

  test("max(100) rejects 200", () => {
    const r = z.number().max(100).safeParse(200);
    expect(r.success).toBe(false);
  });
});

describe("z.number().int", () => {
  test("int accepts integer", () => {
    const result = z.number().int().parse(42);
    expect(result).toBe(42);
  });

  test("int rejects float", () => {
    const r = z.number().int().safeParse(3.14);
    expect(r.success).toBe(false);
  });
});

describe("z.number().positive", () => {
  test("positive accepts 1", () => {
    const result = z.number().positive().parse(1);
    expect(result).toBe(1);
  });

  test("positive rejects 0", () => {
    const r = z.number().positive().safeParse(0);
    expect(r.success).toBe(false);
  });

  test("positive rejects -1", () => {
    const r = z.number().positive().safeParse(-1);
    expect(r.success).toBe(false);
  });
});

describe("z.number().nonnegative", () => {
  test("nonnegative accepts 0", () => {
    const result = z.number().nonnegative().parse(0);
    expect(result).toBe(0);
  });

  test("nonnegative accepts 1", () => {
    const result = z.number().nonnegative().parse(1);
    expect(result).toBe(1);
  });

  test("nonnegative rejects -1", () => {
    const r = z.number().nonnegative().safeParse(-1);
    expect(r.success).toBe(false);
  });
});

describe("z.number chained validators", () => {
  test("min(1).max(10).int() accepts 5", () => {
    const result = z.number().min(1).max(10).int().parse(5);
    expect(result).toBe(5);
  });
});

describe("z.number optional", () => {
  test("optional safeParse on undefined succeeds", () => {
    const r = z.number().optional().safeParse(undefined);
    expect(r.success).toBe(true);
  });
});
