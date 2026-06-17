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

describe("hex encode", () => {
  test("encode bytes returns hex string", () => {
    const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    const result = encoding.hex.encode(bytes);
    expect(typeof result).toBe("string");
    expect(result).toBe("48656c6c6f");
  });

  test("encode single byte 0xff", () => {
    const bytes = new Uint8Array([0xff]);
    const result = encoding.hex.encode(bytes);
    expect(result).toBe("ff");
  });

  test("encode single byte 0x00", () => {
    const bytes = new Uint8Array([0x00]);
    const result = encoding.hex.encode(bytes);
    expect(result).toBe("00");
  });

  test("encode empty array returns empty string", () => {
    const bytes = new Uint8Array([]);
    const result = encoding.hex.encode(bytes);
    expect(result).toBe("");
  });

  test("hex string is lowercase", () => {
    const bytes = new Uint8Array([0xAB, 0xCD, 0xEF]);
    const result = encoding.hex.encode(bytes);
    expect(result).toBe("abcdef");
    expect(result).not.toMatch(/[A-F]/);
  });
});

describe("hex decode", () => {
  test("decode hex string returns bytes", () => {
    const result = encoding.hex.decode("48656c6c6f");
    expect(result.length).toBe(5);
    expect(result[0]).toBe(0x48);
  });

  test("roundtrip encode then decode", () => {
    const original = new Uint8Array([1, 2, 3, 127, 255]);
    const hex = encoding.hex.encode(original);
    const decoded = encoding.hex.decode(hex);
    expect(decoded.length).toBe(original.length);
    expect(decoded[0]).toBe(1);
    expect(decoded[4]).toBe(255);
  });

  test("decode empty string returns empty array", () => {
    const result = encoding.hex.decode("");
    expect(result.length).toBe(0);
  });
});
