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

describe("z.object basic", () => {
  test("parses simple object", () => {
    const result = z.object({ name: z.string() }).parse({ name: "Alice" });
    expect(result.name).toBe("Alice");
  });

  test("rejects missing required field", () => {
    const r = z.object({ name: z.string() }).safeParse({});
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });

  test("rejects wrong type for field", () => {
    const r = z.object({ name: z.string() }).safeParse({ name: 42 });
    expect(r.success).toBe(false);
  });

  test("parses object with multiple fields", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const result = schema.parse({ name: "Bob", age: 30 });
    expect(result.name).toBe("Bob");
    expect(result.age).toBe(30);
  });
});

describe("z.object nested", () => {
  test("parses nested object", () => {
    const schema = z.object({ user: z.object({ name: z.string() }) });
    const result = schema.parse({ user: { name: "Alice" } });
    expect(result.user.name).toBe("Alice");
  });

  test("parses deeply nested (3 levels)", () => {
    const schema = z.object({
      a: z.object({
        b: z.object({
          c: z.string(),
        }),
      }),
    });
    const result = schema.parse({ a: { b: { c: "deep" } } });
    expect(result.a.b.c).toBe("deep");
  });
});

describe("z.object optional fields", () => {
  test("optional field can be omitted", () => {
    const schema = z.object({ name: z.string(), bio: z.string().optional() });
    const result = schema.parse({ name: "Alice" });
    expect(result.name).toBe("Alice");
    expect(result.bio).toBeUndefined();
  });
});

describe("z.object default fields", () => {
  test("default fills missing field", () => {
    const schema = z.object({ role: z.string().default("user") });
    const result = schema.parse({});
    expect(result.role).toBe("user");
  });
});

describe("z.object extra fields stripped", () => {
  test("strips fields not in schema", () => {
    const schema = z.object({ name: z.string() });
    const result = schema.parse({ name: "A", extra: true });
    expect(result.name).toBe("A");
    expect(result.extra).toBeUndefined();
  });
});

describe("z.object nullable field", () => {
  test("nullable field accepts null", () => {
    const schema = z.object({ value: z.number().nullable() });
    const result = schema.parse({ value: null });
    expect(result.value).toBeNull();
  });
});

describe("z.object multiple validation errors", () => {
  test("returns multiple issues for multiple bad fields", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const r = schema.safeParse({ name: 42, age: "old" });
    expect(r.success).toBe(false);
    expect(r.error.issues.length >= 2).toBe(true);
  });
});

describe("z.object issue paths", () => {
  test("issue path contains field name", () => {
    const schema = z.object({ name: z.string() });
    const r = schema.safeParse({ name: 42 });
    expect(r.success).toBe(false);
    const issue = r.error.issues[0];
    expect(issue.path.length).toBeGreaterThan(0);
    expect(issue.path[0]).toBe("name");
  });

  test("nested issue path contains both levels", () => {
    const schema = z.object({ user: z.object({ name: z.string() }) });
    const r = schema.safeParse({ user: { name: 42 } });
    expect(r.success).toBe(false);
    const issue = r.error.issues[0];
    expect(issue.path[0]).toBe("user");
    expect(issue.path[1]).toBe("name");
  });
});

describe("z.object empty schema", () => {
  test("empty object schema accepts empty object", () => {
    const result = z.object({}).parse({});
    expect(typeof result).toBe("object");
  });
});

describe("z.object with array field", () => {
  test("array field validates correctly", () => {
    const schema = z.object({ tags: z.array(z.string()) });
    const result = schema.parse({ tags: ["a", "b"] });
    expect(result.tags).toHaveLength(2);
    expect(result.tags[0]).toBe("a");
    expect(result.tags[1]).toBe("b");
  });
});

describe("z.object deeply nested (5 levels)", () => {
  test("5 levels of nesting validates", () => {
    const schema = z.object({
      l1: z.object({
        l2: z.object({
          l3: z.object({
            l4: z.object({
              l5: z.string(),
            }),
          }),
        }),
      }),
    });
    const result = schema.parse({ l1: { l2: { l3: { l4: { l5: "bottom" } } } } });
    expect(result.l1.l2.l3.l4.l5).toBe("bottom");
  });
});

describe("z.object safeParse", () => {
  test("safeParse on valid returns success true with data", () => {
    const schema = z.object({ x: z.number() });
    const r = schema.safeParse({ x: 10 });
    expect(r.success).toBe(true);
    expect(r.data.x).toBe(10);
  });

  test("safeParse on invalid returns success false with error", () => {
    const schema = z.object({ x: z.number() });
    const r = schema.safeParse({ x: "bad" });
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });
});
