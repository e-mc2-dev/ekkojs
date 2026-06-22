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
import { brotli } from "ekko:compress";

function toBytes(s: string): Uint8Array {
  const arr = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
  return arr;
}

function fromBytes(arr: Uint8Array): string {
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return s;
}

describe("brotli compress", () => {
  test("compress returns Uint8Array", () => {
    const result = brotli.compress(toBytes("hello"));
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  test("compress of empty string returns bytes", () => {
    const result = brotli.compress(toBytes(""));
    expect(result).toBeInstanceOf(Uint8Array);
  });

  test("compressed is smaller than original for large input", () => {
    const input = "abcdefghij".repeat(1000);
    const result = brotli.compress(toBytes(input));
    expect(result.length).toBeLessThan(input.length);
  });
});

describe("brotli decompress", () => {
  test("decompress reverses compress for 'hello'", () => {
    const compressed = brotli.compress(toBytes("hello"));
    const decompressed = brotli.decompress(compressed);
    expect(fromBytes(decompressed)).toBe("hello");
  });

  test("roundtrip with longer string", () => {
    const input = "Brotli compression test data. ".repeat(200);
    const compressed = brotli.compress(toBytes(input));
    const decompressed = brotli.decompress(compressed);
    expect(fromBytes(decompressed)).toBe(input);
  });

  test("roundtrip with empty string", () => {
    const compressed = brotli.compress(toBytes(""));
    const decompressed = brotli.decompress(compressed);
    expect(fromBytes(decompressed)).toBe("");
  });

  test("roundtrip with single character", () => {
    const compressed = brotli.compress(toBytes("z"));
    const decompressed = brotli.decompress(compressed);
    expect(fromBytes(decompressed)).toBe("z");
  });
});

describe("brotli binary data", () => {
  test("roundtrip with binary Uint8Array", () => {
    const input = new Uint8Array(256);
    for (let i = 0; i < 256; i++) input[i] = i;
    const compressed = brotli.compress(input);
    const decompressed = brotli.decompress(compressed);
    expect(decompressed).toBeInstanceOf(Uint8Array);
    expect(decompressed.length).toBe(input.length);
  });

  test("compressed output is non-empty", () => {
    const compressed = brotli.compress(toBytes("brotli test"));
    expect(compressed.length).toBeGreaterThan(0);
  });

  test("highly repetitive data compresses well", () => {
    const input = "b".repeat(10000);
    const compressed = brotli.compress(toBytes(input));
    expect(compressed.length).toBeLessThan(input.length / 10);
  });
});
