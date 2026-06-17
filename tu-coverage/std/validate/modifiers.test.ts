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

describe("optional modifier", () => {
  test("undefined passes optional", () => {
    const r = z.string().optional().safeParse(undefined);
    expect(r.success).toBe(true);
    expect(r.data).toBeUndefined();
  });

  test("null fails optional (not nullable)", () => {
    const r = z.string().optional().safeParse(null);
    expect(r.success).toBe(false);
  });
});

describe("nullable modifier", () => {
  test("null passes nullable", () => {
    const r = z.string().nullable().safeParse(null);
    expect(r.success).toBe(true);
    expect(r.data).toBeNull();
  });

  test("undefined fails nullable-only", () => {
    const r = z.string().nullable().safeParse(undefined);
    expect(r.success).toBe(false);
  });
});

describe("optional + nullable", () => {
  test("undefined passes optional+nullable", () => {
    const r = z.string().optional().nullable().safeParse(undefined);
    expect(r.success).toBe(true);
  });

  test("null passes optional+nullable", () => {
    const r = z.string().optional().nullable().safeParse(null);
    expect(r.success).toBe(true);
  });
});

describe("default modifier", () => {
  test("default('foo') replaces undefined with 'foo'", () => {
    const result = z.string().default("foo").parse(undefined);
    expect(result).toBe("foo");
  });

  test("default(0) replaces undefined with 0", () => {
    const result = z.number().default(0).parse(undefined);
    expect(result).toBe(0);
  });

  test("default('hi') returns 'hi' for undefined", () => {
    const result = z.string().default("hi").parse(undefined);
    expect(result).toBe("hi");
  });

  test("default does not override provided value", () => {
    const result = z.string().default("hi").parse("bye");
    expect(result).toBe("bye");
  });

  test("default with boolean", () => {
    const result = z.boolean().default(true).parse(undefined);
    expect(result).toBe(true);
  });

  test("default with number", () => {
    const result = z.number().default(99).parse(undefined);
    expect(result).toBe(99);
  });

  test("safeParse with default returns default value in data", () => {
    const r = z.string().default("fallback").safeParse(undefined);
    expect(r.success).toBe(true);
    expect(r.data).toBe("fallback");
  });
});

describe("chaining modifiers with validators", () => {
  test("min(2).optional: undefined passes", () => {
    const schema = z.string().min(2).optional();
    const r = schema.safeParse(undefined);
    expect(r.success).toBe(true);
  });

  test("min(2).optional: short string fails", () => {
    const schema = z.string().min(2).optional();
    const r = schema.safeParse("a");
    expect(r.success).toBe(false);
  });

  test("min(2).optional: valid string passes", () => {
    const schema = z.string().min(2).optional();
    const r = schema.safeParse("ab");
    expect(r.success).toBe(true);
    expect(r.data).toBe("ab");
  });
});

describe("object with all optional fields", () => {
  test("empty object passes when all fields optional", () => {
    const schema = z.object({
      a: z.string().optional(),
      b: z.number().optional(),
    });
    const result = schema.parse({});
    expect(result.a).toBeUndefined();
    expect(result.b).toBeUndefined();
  });
});

describe("object with defaults", () => {
  test("defaults fill all missing fields", () => {
    const schema = z.object({
      name: z.string().default("anon"),
      age: z.number().default(0),
    });
    const result = schema.parse({});
    expect(result.name).toBe("anon");
    expect(result.age).toBe(0);
  });
});

describe("nullable in array items", () => {
  test("nullable items accept null in array", () => {
    const schema = z.array(z.string().nullable());
    const result = schema.parse(["a", null, "b"]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("a");
    expect(result[1]).toBeNull();
    expect(result[2]).toBe("b");
  });
});
