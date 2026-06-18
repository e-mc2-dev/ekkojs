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

describe("z.array basic", () => {
  test("parses array of strings", () => {
    const result = z.array(z.string()).parse(["a", "b"]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("a");
    expect(result[1]).toBe("b");
  });

  test("parses array of numbers", () => {
    const result = z.array(z.number()).parse([1, 2, 3]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(3);
  });

  test("rejects non-array value", () => {
    const r = z.array(z.string()).safeParse("not array");
    expect(r.success).toBe(false);
    expect(r.error.issues.length).toBeGreaterThan(0);
  });

  test("rejects array with wrong item types", () => {
    const r = z.array(z.string()).safeParse([1, 2]);
    expect(r.success).toBe(false);
  });

  test("accepts empty array", () => {
    const result = z.array(z.string()).parse([]);
    expect(result).toHaveLength(0);
  });
});

describe("z.array item validation", () => {
  test("int check rejects float in array", () => {
    const r = z.array(z.number().int()).safeParse([1, 2.5]);
    expect(r.success).toBe(false);
  });
});

describe("z.array nested", () => {
  test("nested arrays validate", () => {
    const schema = z.array(z.array(z.number()));
    const result = schema.parse([[1, 2], [3, 4]]);
    expect(result).toHaveLength(2);
    expect(result[0][0]).toBe(1);
    expect(result[1][1]).toBe(4);
  });
});

describe("z.array of objects", () => {
  test("array of objects validates", () => {
    const schema = z.array(z.object({ id: z.number() }));
    const result = schema.parse([{ id: 1 }, { id: 2 }]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });
});

describe("z.array issue path", () => {
  test("safeParse error path includes array index", () => {
    const schema = z.array(z.string());
    const r = schema.safeParse(["ok", 42]);
    expect(r.success).toBe(false);
    const issue = r.error.issues[0];
    expect(issue.path.length).toBeGreaterThan(0);
    expect(issue.path[0]).toBe("1");
  });

  test("first item error has index 0 in path", () => {
    const schema = z.array(z.number());
    const r = schema.safeParse(["bad"]);
    expect(r.success).toBe(false);
    expect(r.error.issues[0].path[0]).toBe("0");
  });
});

describe("z.array modifiers", () => {
  test("optional array accepts undefined", () => {
    const result = z.array(z.string()).optional().parse(undefined);
    expect(result).toBeUndefined();
  });
});
