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

describe("z.any", () => {
  test("any accepts string", () => {
    const result = z.any().parse("anything");
    expect(result).toBe("anything");
  });

  test("any accepts number", () => {
    const result = z.any().parse(42);
    expect(result).toBe(42);
  });

  test("any accepts undefined", () => {
    const r = z.any().optional().safeParse(undefined);
    expect(r.success).toBe(true);
  });

  test("any accepts null", () => {
    const r = z.any().nullable().safeParse(null);
    expect(r.success).toBe(true);
  });

  test("any accepts object", () => {
    const result = z.any().parse({ key: "value" });
    expect(result.key).toBe("value");
  });
});

describe("z.unknown", () => {
  test("unknown accepts number", () => {
    const result = z.unknown().parse(42);
    expect(result).toBe(42);
  });

  test("unknown accepts string", () => {
    const result = z.unknown().parse("test");
    expect(result).toBe("test");
  });
});

describe("schema reuse", () => {
  test("same schema validates multiple values", () => {
    const schema = z.string();
    const r1 = schema.safeParse("first");
    const r2 = schema.safeParse("second");
    expect(r1.success).toBe(true);
    expect(r1.data).toBe("first");
    expect(r2.success).toBe(true);
    expect(r2.data).toBe("second");
  });

  test("two parse calls on same schema both work", () => {
    const schema = z.number().min(0).max(100);
    const a = schema.parse(50);
    const b = schema.parse(75);
    expect(a).toBe(50);
    expect(b).toBe(75);
  });
});

describe("schema immutability", () => {
  test("min does not modify original schema", () => {
    const base = z.string();
    const withMin = base.min(3);
    const r1 = base.safeParse("ab");
    const r2 = withMin.safeParse("ab");
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(false);
  });
});

describe("empty string edge case", () => {
  test("empty string passes z.string()", () => {
    const result = z.string().parse("");
    expect(result).toBe("");
  });

  test("empty string fails z.string().nonempty()", () => {
    const r = z.string().nonempty().safeParse("");
    expect(r.success).toBe(false);
  });
});

describe("negative zero", () => {
  test("negative zero passes z.number()", () => {
    const r = z.number().safeParse(-0);
    expect(r.success).toBe(true);
  });
});

describe("large values", () => {
  test("very long string passes z.string()", () => {
    const long = "a".repeat(10000);
    const result = z.string().parse(long);
    expect(result.length).toBe(10000);
  });

  test("very large number passes z.number()", () => {
    const result = z.number().parse(Number.MAX_SAFE_INTEGER);
    expect(result).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("deeply nested validation", () => {
  test("5 levels deep validates correctly", () => {
    const schema = z.object({
      a: z.object({
        b: z.object({
          c: z.object({
            d: z.object({
              e: z.number(),
            }),
          }),
        }),
      }),
    });
    const result = schema.parse({ a: { b: { c: { d: { e: 42 } } } } });
    expect(result.a.b.c.d.e).toBe(42);
  });
});

describe("large array validation", () => {
  test("array with 100 items validates", () => {
    const items: number[] = [];
    for (let i = 0; i < 100; i++) {
      items.push(i);
    }
    const result = z.array(z.number()).parse(items);
    expect(result).toHaveLength(100);
    expect(result[0]).toBe(0);
    expect(result[99]).toBe(99);
  });
});

describe("object with many fields", () => {
  test("object with 20 fields validates", () => {
    const shape: any = {};
    const data: any = {};
    for (let i = 0; i < 20; i++) {
      shape["f" + i] = z.number();
      data["f" + i] = i;
    }
    const schema = z.object(shape);
    const result = schema.parse(data);
    expect(result.f0).toBe(0);
    expect(result.f19).toBe(19);
  });
});

describe("chaining many validators", () => {
  test("string with min, max, and email", () => {
    const schema = z.string().min(5).max(100).email();
    const result = schema.parse("user@example.com");
    expect(result).toBe("user@example.com");
  });
});
