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

describe("utf8 encode", () => {
  test("encode 'hello' returns Uint8Array", () => {
    const result = encoding.utf8.encode("hello");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(5);
  });

  test("encode ASCII characters have correct byte values", () => {
    const result = encoding.utf8.encode("ABC");
    expect(result[0]).toBe(65);
    expect(result[1]).toBe(66);
    expect(result[2]).toBe(67);
  });

  test("encode empty string returns empty array", () => {
    const result = encoding.utf8.encode("");
    expect(result.length).toBe(0);
  });

  test("encode unicode uses multiple bytes", () => {
    const result = encoding.utf8.encode("é");
    expect(result.length).toBeGreaterThan(1);
  });
});

describe("utf8 decode", () => {
  test("decode bytes returns string", () => {
    const bytes = new Uint8Array([104, 101, 108, 108, 111]);
    const result = encoding.utf8.decode(bytes);
    expect(result).toBe("hello");
  });

  test("decode empty bytes returns empty string", () => {
    const result = encoding.utf8.decode(new Uint8Array([]));
    expect(result).toBe("");
  });
});

describe("utf8 roundtrip", () => {
  test("encode then decode returns original ASCII", () => {
    const input = "hello world 123";
    const encoded = encoding.utf8.encode(input);
    const decoded = encoding.utf8.decode(encoded);
    expect(decoded).toBe(input);
  });

  test("roundtrip with unicode characters", () => {
    const input = "café üöä";
    const encoded = encoding.utf8.encode(input);
    const decoded = encoding.utf8.decode(encoded);
    expect(decoded).toBe(input);
  });

  test("roundtrip with emoji", () => {
    const input = "hello 🌍";
    const encoded = encoding.utf8.encode(input);
    const decoded = encoding.utf8.decode(encoded);
    expect(decoded).toBe(input);
  });
});
