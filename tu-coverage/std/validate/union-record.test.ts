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

describe("z.union", () => {
  test("accepts first type in union (string)", () => {
    const result = z.union([z.string(), z.number()]).parse("hello");
    expect(result).toBe("hello");
  });

  test("accepts second type in union (number)", () => {
    const result = z.union([z.string(), z.number()]).parse(42);
    expect(result).toBe(42);
  });

  test("rejects value matching no type", () => {
    const r = z.union([z.string(), z.number()]).safeParse(true);
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });

  test("literal union accepts matching literal", () => {
    const schema = z.union([z.literal("a"), z.literal("b")]);
    const result = schema.parse("a");
    expect(result).toBe("a");
  });

  test("discriminated union validates correct branch", () => {
    const schema = z.union([
      z.object({ type: z.literal("a"), value: z.string() }),
      z.object({ type: z.literal("b"), value: z.number() }),
    ]);
    const result = schema.parse({ type: "a", value: "hello" });
    expect(result.type).toBe("a");
    expect(result.value).toBe("hello");
  });

  test("union with 3 types accepts third type", () => {
    const schema = z.union([z.string(), z.number(), z.boolean()]);
    const result = schema.parse(true);
    expect(result).toBe(true);
  });
});

describe("z.record", () => {
  test("accepts record of numbers", () => {
    const result = z.record(z.number()).parse({ x: 1, y: 2 });
    expect(result.x).toBe(1);
    expect(result.y).toBe(2);
  });

  test("accepts record of strings", () => {
    const result = z.record(z.string()).parse({ a: "hello" });
    expect(result.a).toBe("hello");
  });

  test("rejects record with wrong value type", () => {
    const r = z.record(z.number()).safeParse({ x: "bad" });
    expect(r.success).toBe(false);
  });

  test("rejects null", () => {
    const r = z.record(z.string()).safeParse(null);
    expect(r.success).toBe(false);
  });

  test("record with nested schema", () => {
    const schema = z.record(z.object({ count: z.number() }));
    const result = schema.parse({ a: { count: 1 }, b: { count: 2 } });
    expect(result.a.count).toBe(1);
    expect(result.b.count).toBe(2);
  });

  test("record error path includes key name", () => {
    const r = z.record(z.number()).safeParse({ good: 1, bad: "x" });
    expect(r.success).toBe(false);
    const issue = r.error.issues[0];
    expect(issue.path.length).toBeGreaterThan(0);
    expect(issue.path[0]).toBe("bad");
  });
});
