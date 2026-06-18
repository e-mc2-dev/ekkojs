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

describe("json.parse deeply nested object", () => {
  test("parse 5 levels deep", () => {
    const input = '{"a":{"b":{"c":{"d":{"e":"deep"}}}}}';
    const result = json.parse(input);
    expect(result.a.b.c.d.e).toBe("deep");
  });
});

describe("json.stringify key order", () => {
  test("stringify preserves key order of the object", () => {
    const obj = { z: 1, a: 2, m: 3 };
    const result = json.stringify(obj);
    
    const parsed = json.parse(result);
    expect(parsed.z).toBe(1);
    expect(parsed.a).toBe(2);
    expect(parsed.m).toBe(3);
  });
});

describe("json.parse escaped characters", () => {
  test("parse handles escaped quotes in strings", () => {
    const input = '{"msg":"she said \\"hello\\""}';
    const result = json.parse(input);
    expect(result.msg).toBe('she said "hello"');
  });

  test("parse handles unicode escape sequences", () => {
    const input = '{"char":"\\u0041"}';
    const result = json.parse(input);
    expect(result.char).toBe("A");
  });
});

describe("json.stringify special characters", () => {
  test("stringify handles newline and tab", () => {
    const obj = { text: "line1\nline2\ttab" };
    const result = json.stringify(obj);
    expect(result).toContain("\\n");
    expect(result).toContain("\\t");
    
    const parsed = json.parse(result);
    expect(parsed.text).toBe("line1\nline2\ttab");
  });
});

describe("json.parse large arrays", () => {
  test("parse 1000-element array", () => {
    const arr: number[] = [];
    for (let i = 0; i < 1000; i++) arr.push(i);
    const input = json.stringify(arr);
    const result = json.parse(input);
    expect(result).toHaveLength(1000);
    expect(result[0]).toBe(0);
    expect(result[999]).toBe(999);
  });
});

describe("json stringify/parse roundtrip with all JSON types", () => {
  test("roundtrip with mixed types", () => {
    const obj = {
      str: "hello",
      num: 42,
      float: 3.14,
      bool_t: true,
      bool_f: false,
      nil: null,
      arr: [1, "two", true, null],
      nested: { x: 10 }
    };
    const s = json.stringify(obj);
    const parsed = json.parse(s);
    expect(parsed.str).toBe("hello");
    expect(parsed.num).toBe(42);
    expect(parsed.bool_t).toBe(true);
    expect(parsed.bool_f).toBe(false);
    expect(parsed.nil).toBeNull();
    expect(parsed.arr).toHaveLength(4);
    expect(parsed.arr[0]).toBe(1);
    expect(parsed.arr[1]).toBe("two");
    expect(parsed.arr[2]).toBe(true);
    expect(parsed.arr[3]).toBeNull();
    expect(parsed.nested.x).toBe(10);
  });
});

describe("json.parse returns correct types", () => {
  test("number is number, not string", () => {
    const result = json.parse("42");
    expect(typeof result).toBe("number");
    expect(result).toBe(42);
  });

  test("string is string", () => {
    const result = json.parse('"hello"');
    expect(typeof result).toBe("string");
  });

  test("boolean is boolean", () => {
    const result = json.parse("true");
    expect(typeof result).toBe("boolean");
  });

  test("parse of number literal '42' returns number type", () => {
    const result = json.parse("42");
    expect(typeof result).toBe("number");
    expect(result).toBe(42);
  });
});

describe("json.stringify of undefined", () => {
  test("stringify of undefined returns undefined (not a string)", () => {
    const result = json.stringify(undefined);

    const isUndefined = result === undefined;
    const isNullStr = result === "null";
    const isUndefinedStr = result === "undefined";
    
    expect(isUndefined || isNullStr || isUndefinedStr).toBe(true);
  });
});
