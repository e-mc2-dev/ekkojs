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

describe("parse method", () => {
  test("parse returns value on success", () => {
    const result = z.string().parse("hello");
    expect(result).toBe("hello");
  });

  test("parse throws on failure", () => {
    const fn = () => z.string().parse(42);
    expect(fn).toThrow();
  });

  test("parse throws error with name ValidationError", () => {
    let errorName = "";
    try {
      z.string().parse(42);
    } catch (e: any) {
      errorName = e.name;
    }
    expect(errorName).toBe("ValidationError");
  });

  test("parse throws error with issues array", () => {
    let issues: any[] = [];
    try {
      z.string().parse(42);
    } catch (e: any) {
      issues = e.issues;
    }
    expect(issues.length).toBeGreaterThan(0);
  });

  test("parse throws error with message string", () => {
    let msg = "";
    try {
      z.string().parse(42);
    } catch (e: any) {
      msg = e.message;
    }
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe("safeParse method", () => {
  test("safeParse returns success true with data on valid input", () => {
    const r = z.string().safeParse("hello");
    expect(r.success).toBe(true);
    expect(r.data).toBe("hello");
  });

  test("safeParse returns success false with error on invalid input", () => {
    const r = z.string().safeParse(42);
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });

  test("safeParse never throws", () => {
    let threw = false;
    try {
      z.string().safeParse(42);
      z.number().safeParse("bad");
      z.boolean().safeParse(null);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});

describe("issue structure", () => {
  test("issue has path array", () => {
    const r = z.object({ name: z.string() }).safeParse({ name: 42 });
    expect(r.success).toBe(false);
    const issue = r.error.issues[0];
    expect(Array.isArray(issue.path)).toBe(true);
  });

  test("issue has message string", () => {
    const r = z.string().safeParse(42);
    expect(r.success).toBe(false);
    const issue = r.error.issues[0];
    expect(typeof issue.message).toBe("string");
    expect(issue.message.length).toBeGreaterThan(0);
  });

  test("multiple issues for object with multiple bad fields", () => {
    const schema = z.object({ a: z.string(), b: z.number(), c: z.boolean() });
    const r = schema.safeParse({ a: 1, b: "x", c: "y" });
    expect(r.success).toBe(false);
    expect(r.error.issues.length >= 3).toBe(true);
  });

  test("nested object issue path is correct", () => {
    const schema = z.object({ user: z.object({ name: z.string() }) });
    const r = schema.safeParse({ user: { name: 42 } });
    expect(r.success).toBe(false);
    const issue = r.error.issues[0];
    expect(issue.path[0]).toBe("user");
    expect(issue.path[1]).toBe("name");
  });

  test("array issue path includes index", () => {
    const schema = z.array(z.string());
    const r = schema.safeParse(["ok", "ok", 42]);
    expect(r.success).toBe(false);
    const issue = r.error.issues[0];
    expect(issue.path[0]).toBe("2");
  });
});

describe("parse returns data by value", () => {
  test("parse on valid data returns same values", () => {
    const input = { name: "Alice", age: 30 };
    const schema = z.object({ name: z.string(), age: z.number() });
    const result = schema.parse(input);
    expect(result.name).toBe("Alice");
    expect(result.age).toBe(30);
  });
});
