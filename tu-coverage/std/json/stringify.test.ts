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

describe("json.stringify", () => {
  test("stringifies simple object", () => {
    const result = json.stringify({ a: 1 });
    expect(result).toBe('{"a":1}');
  });

  test("stringifies object with multiple keys", () => {
    const result = json.stringify({ name: "alice", age: 30 });
    expect(result).toContain('"name"');
    expect(result).toContain('"alice"');
    expect(result).toContain('"age"');
    expect(result).toContain("30");
  });

  test("stringifies array", () => {
    const result = json.stringify([1, 2, 3]);
    expect(result).toBe("[1,2,3]");
  });

  test("stringifies string value", () => {
    const result = json.stringify("hello");
    expect(result).toBe('"hello"');
  });

  test("stringifies number value", () => {
    const result = json.stringify(42);
    expect(result).toBe("42");
  });

  test("stringifies boolean true", () => {
    const result = json.stringify(true);
    expect(result).toBe("true");
  });

  test("stringifies boolean false", () => {
    const result = json.stringify(false);
    expect(result).toBe("false");
  });

  test("stringifies null", () => {
    const result = json.stringify(null);
    expect(result).toBe("null");
  });

  test("stringifies nested objects", () => {
    const result = json.stringify({ a: { b: { c: 1 } } });
    expect(result).toContain('"a"');
    expect(result).toContain('"b"');
    expect(result).toContain('"c"');
  });

  test("stringifies special characters in strings", () => {
    const result = json.stringify({ msg: 'hello "world"' });
    expect(result).toContain('\\"world\\"');
  });
});
