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

describe("json.parse", () => {
  test("parses object with properties", () => {
    const result = json.parse('{"a":1}');
    expect(result.a).toBe(1);
  });

  test("parses object with multiple properties", () => {
    const result = json.parse('{"name":"alice","age":30}');
    expect(result.name).toBe("alice");
    expect(result.age).toBe(30);
  });

  test("parses array", () => {
    const result = json.parse("[1,2,3]");
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(3);
  });

  test("parses string value", () => {
    const result = json.parse('"hello"');
    expect(result).toBe("hello");
  });

  test("parses number value", () => {
    const result = json.parse("42");
    expect(result).toBe(42);
  });

  test("parses boolean true", () => {
    const result = json.parse("true");
    expect(result).toBe(true);
  });

  test("parses boolean false", () => {
    const result = json.parse("false");
    expect(result).toBe(false);
  });

  test("parses null", () => {
    const result = json.parse("null");
    expect(result).toBeNull();
  });

  test("parses nested objects", () => {
    const result = json.parse('{"a":{"b":{"c":42}}}');
    expect(result.a.b.c).toBe(42);
  });

  test("invalid JSON throws", () => {
    const fn = () => json.parse("{invalid json");
    expect(fn).toThrow();
  });
});
