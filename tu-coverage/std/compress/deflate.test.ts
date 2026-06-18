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
import { deflate } from "ekko:compress";

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

describe("deflate compress", () => {
  test("compress returns Uint8Array", () => {
    const result = deflate.compress(toBytes("hello"));
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  test("compress of empty string returns bytes", () => {
    const result = deflate.compress(toBytes(""));
    expect(result).toBeInstanceOf(Uint8Array);
  });

  test("compressed is smaller than original for large input", () => {
    const input = "abcdefghij".repeat(1000);
    const result = deflate.compress(toBytes(input));
    expect(result.length).toBeLessThan(input.length);
  });
});

describe("deflate decompress", () => {
  test("decompress reverses compress for 'hello'", () => {
    const compressed = deflate.compress(toBytes("hello"));
    const decompressed = deflate.decompress(compressed);
    expect(fromBytes(decompressed)).toBe("hello");
  });

  test("roundtrip with longer string", () => {
    const input = "Deflate is a lossless data compression algorithm. ".repeat(100);
    const compressed = deflate.compress(toBytes(input));
    const decompressed = deflate.decompress(compressed);
    expect(fromBytes(decompressed)).toBe(input);
  });

  test("roundtrip with empty string", () => {
    const compressed = deflate.compress(toBytes(""));
    const decompressed = deflate.decompress(compressed);
    expect(fromBytes(decompressed)).toBe("");
  });

  test("roundtrip with single character", () => {
    const compressed = deflate.compress(toBytes("q"));
    const decompressed = deflate.decompress(compressed);
    expect(fromBytes(decompressed)).toBe("q");
  });
});

describe("deflate compression ratio", () => {
  test("highly repetitive data compresses well", () => {
    const input = "d".repeat(10000);
    const compressed = deflate.compress(toBytes(input));
    expect(compressed.length).toBeLessThan(input.length / 10);
  });

  test("compressed output is non-empty for non-empty input", () => {
    const compressed = deflate.compress(toBytes("deflate data"));
    expect(compressed.length).toBeGreaterThan(0);
  });

  test("roundtrip preserves newlines", () => {
    const input = "line1\nline2\nline3\n";
    const compressed = deflate.compress(toBytes(input));
    const decompressed = deflate.decompress(compressed);
    expect(fromBytes(decompressed)).toBe(input);
  });

  test("roundtrip with numbers and symbols", () => {
    const input = "123!@#$%^&*()_+-=[]{}|;':\",./<>?";
    const compressed = deflate.compress(toBytes(input));
    const decompressed = deflate.decompress(compressed);
    expect(fromBytes(decompressed)).toBe(input);
  });
});
