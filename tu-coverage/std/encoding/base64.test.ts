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
import * as encoding from "ekko:text/encoding";

describe("base64 encode", () => {
  test("encode returns a string", () => {
    const result = encoding.base64.encode("hello");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("encode of 'hello' produces known base64", () => {
    const result = encoding.base64.encode("hello");
    expect(result).toBe("aGVsbG8=");
  });

  test("encode empty string returns empty or padding", () => {
    const result = encoding.base64.encode("");
    expect(result).toBe("");
  });

  test("encode with unicode content", () => {
    const result = encoding.base64.encode("café");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("base64 decode", () => {
  test("decode reverses encode for 'hello'", () => {
    const encoded = encoding.base64.encode("hello");
    const decoded = encoding.base64.decode(encoded);
    
    const str = encoding.utf8.decode(decoded);
    expect(str).toBe("hello");
  });

  test("roundtrip with longer string", () => {
    const input = "The quick brown fox jumps over the lazy dog";
    const encoded = encoding.base64.encode(input);
    const decoded = encoding.base64.decode(encoded);
    const str = encoding.utf8.decode(decoded);
    expect(str).toBe(input);
  });

  test("roundtrip with special characters", () => {
    const input = "a+b/c=d";
    const encoded = encoding.base64.encode(input);
    const decoded = encoding.base64.decode(encoded);
    const str = encoding.utf8.decode(decoded);
    expect(str).toBe(input);
  });
});

describe("base64 URL-safe", () => {
  test("encodeUrl produces URL-safe string (no + or /)", () => {
    const input = "subjects?_d=1&sort=asc";
    const result = encoding.base64.encodeUrl(input);
    expect(result).not.toContain("+");
    expect(result).not.toContain("/");
  });

  test("decodeUrl roundtrip", () => {
    const input = "hello world! foo/bar+baz=qux";
    const encoded = encoding.base64.encodeUrl(input);
    const decoded = encoding.base64.decodeUrl(encoded);
    const str = encoding.utf8.decode(decoded);
    expect(str).toBe(input);
  });

  test("encodeUrl returns a string", () => {
    const result = encoding.base64.encodeUrl("test");
    expect(typeof result).toBe("string");
  });
});
