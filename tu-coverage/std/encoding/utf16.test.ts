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

describe("utf16 encode", () => {
  test("encode 'hello' returns Uint8Array with 2 bytes per char", () => {
    const result = encoding.utf16.encode("hello");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(10);
  });

  test("encode empty string returns empty array", () => {
    const result = encoding.utf16.encode("");
    expect(result.length).toBe(0);
  });

  test("encode single char returns 2 bytes", () => {
    const result = encoding.utf16.encode("A");
    expect(result.length).toBe(2);
  });
});

describe("utf16 decode", () => {
  test("decode returns original string", () => {
    const encoded = encoding.utf16.encode("hello");
    const decoded = encoding.utf16.decode(encoded);
    expect(decoded).toBe("hello");
  });

  test("decode empty bytes returns empty string", () => {
    const result = encoding.utf16.decode(new Uint8Array([]));
    expect(result).toBe("");
  });
});

describe("utf16 roundtrip", () => {
  test("roundtrip ASCII string", () => {
    const input = "test string 123";
    const encoded = encoding.utf16.encode(input);
    const decoded = encoding.utf16.decode(encoded);
    expect(decoded).toBe(input);
  });

  test("roundtrip unicode string", () => {
    const input = "café üöä";
    const encoded = encoding.utf16.encode(input);
    const decoded = encoding.utf16.decode(encoded);
    expect(decoded).toBe(input);
  });
});

describe("utf16 big-endian", () => {
  test("encodeBE returns Uint8Array", () => {
    const result = encoding.utf16.encodeBE("AB");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(4);
  });

  test("decodeBE roundtrip", () => {
    const input = "hello world";
    const encoded = encoding.utf16.encodeBE(input);
    const decoded = encoding.utf16.decodeBE(encoded);
    expect(decoded).toBe(input);
  });

  test("BE and LE produce different byte sequences for non-ASCII", () => {
    const input = "AB";
    const le = encoding.utf16.encode(input);
    const be = encoding.utf16.encodeBE(input);
    
    expect(le[0]).not.toBe(be[0]);
  });
});
