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

describe("json.parseBytes", () => {
  test("parses Uint8Array to object", () => {
    
    const bytes = new Uint8Array([123, 34, 120, 34, 58, 49, 125]);
    const result = json.parseBytes(bytes);
    expect(result.x).toBe(1);
  });

  test("parses Uint8Array to array", () => {
    
    const str = "[1,2,3]";
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    const result = json.parseBytes(bytes);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(1);
  });

  test("parses Uint8Array with nested object", () => {
    const str = '{"a":{"b":2}}';
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    const result = json.parseBytes(bytes);
    expect(result.a.b).toBe(2);
  });
});

describe("json.stringifyBytes", () => {
  test("returns Uint8Array", () => {
    const result = json.stringifyBytes({ a: 1 });
    expect(result instanceof Uint8Array).toBe(true);
  });

  test("returns non-empty Uint8Array", () => {
    const result = json.stringifyBytes({ a: 1 });
    expect(result.length).toBeGreaterThan(0);
  });

  test("stringifyBytes content is valid JSON", () => {
    const result = json.stringifyBytes({ key: "value" });
    const decoded = String.fromCharCode(...result);
    expect(decoded).toContain('"key"');
    expect(decoded).toContain('"value"');
  });

  test("roundtrip: stringifyBytes then parseBytes", () => {
    const original = { name: "test", count: 42, active: true };
    const bytes = json.stringifyBytes(original);
    const restored = json.parseBytes(bytes);
    expect(restored.name).toBe("test");
    expect(restored.count).toBe(42);
    expect(restored.active).toBe(true);
  });

  test("roundtrip with array", () => {
    const original = [1, "two", true, null];
    const bytes = json.stringifyBytes(original);
    const restored = json.parseBytes(bytes);
    expect(restored[0]).toBe(1);
    expect(restored[1]).toBe("two");
    expect(restored[2]).toBe(true);
    expect(restored[3]).toBeNull();
  });
});
