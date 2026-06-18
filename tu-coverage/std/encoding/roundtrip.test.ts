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

describe("base64 roundtrip", () => {
  test("empty string", () => {
    const decoded = encoding.base64.decode(encoding.base64.encode(""));
    const result = encoding.utf8.decode(decoded);
    expect(result).toBe("");
  });

  test("short string", () => {
    const input = "hi";
    const decoded = encoding.base64.decode(encoding.base64.encode(input));
    const result = encoding.utf8.decode(decoded);
    expect(result).toBe(input);
  });

  test("long string", () => {
    const input = "a".repeat(1000);
    const decoded = encoding.base64.decode(encoding.base64.encode(input));
    const result = encoding.utf8.decode(decoded);
    expect(result).toBe(input);
  });

  test("string with newlines", () => {
    const input = "line1\nline2\nline3";
    const decoded = encoding.base64.decode(encoding.base64.encode(input));
    const result = encoding.utf8.decode(decoded);
    expect(result).toBe(input);
  });
});

describe("hex roundtrip", () => {
  test("empty bytes", () => {
    const input = new Uint8Array([]);
    const result = encoding.hex.decode(encoding.hex.encode(input));
    expect(result.length).toBe(0);
  });

  test("single byte", () => {
    const input = new Uint8Array([42]);
    const result = encoding.hex.decode(encoding.hex.encode(input));
    expect(result[0]).toBe(42);
  });

  test("all byte values 0-255", () => {
    const input = new Uint8Array(256);
    for (let i = 0; i < 256; i++) input[i] = i;
    const result = encoding.hex.decode(encoding.hex.encode(input));
    expect(result.length).toBe(256);
    expect(result[0]).toBe(0);
    expect(result[255]).toBe(255);
  });
});

describe("utf8 roundtrip", () => {
  test("empty string", () => {
    const result = encoding.utf8.decode(encoding.utf8.encode(""));
    expect(result).toBe("");
  });

  test("ASCII string", () => {
    const input = "abcdefghijklmnopqrstuvwxyz";
    expect(encoding.utf8.decode(encoding.utf8.encode(input))).toBe(input);
  });

  test("mixed unicode", () => {
    const input = "hello éèê üöä 世界";
    expect(encoding.utf8.decode(encoding.utf8.encode(input))).toBe(input);
  });

  test("special characters", () => {
    const input = "tab\there\nnewline\r\nwindows";
    expect(encoding.utf8.decode(encoding.utf8.encode(input))).toBe(input);
  });
});
