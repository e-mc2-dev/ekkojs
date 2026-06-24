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
import * as jsonMod from "ekko:text/json";

const { json } = jsonMod;

describe("json roundtrip (stringify then parse)", () => {
  test("object roundtrip", () => {
    const original = { a: 1, b: "hello", c: true };
    const result = json.parse(json.stringify(original));
    expect(result.a).toBe(1);
    expect(result.b).toBe("hello");
    expect(result.c).toBe(true);
  });

  test("array roundtrip", () => {
    const original = [1, 2, 3, 4, 5];
    const result = json.parse(json.stringify(original));
    expect(result).toHaveLength(5);
    expect(result[0]).toBe(1);
    expect(result[4]).toBe(5);
  });

  test("string roundtrip", () => {
    const original = "hello world";
    const result = json.parse(json.stringify(original));
    expect(result).toBe("hello world");
  });

  test("number roundtrip", () => {
    const original = 3.14;
    const result = json.parse(json.stringify(original));
    expect(result).toBe(3.14);
  });

  test("boolean roundtrip", () => {
    const result = json.parse(json.stringify(true));
    expect(result).toBe(true);
  });

  test("null roundtrip", () => {
    const result = json.parse(json.stringify(null));
    expect(result).toBeNull();
  });

  test("nested object roundtrip", () => {
    const original = {
      user: { name: "alice", tags: ["admin", "user"] },
      meta: { count: 42 },
    };
    const result = json.parse(json.stringify(original));
    expect(result.user.name).toBe("alice");
    expect(result.user.tags[0]).toBe("admin");
    expect(result.meta.count).toBe(42);
  });

  test("array of objects roundtrip", () => {
    const original = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ];
    const result = json.parse(json.stringify(original));
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].name).toBe("b");
  });
});
