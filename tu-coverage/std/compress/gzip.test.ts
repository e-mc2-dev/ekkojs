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
import { gzip } from "ekko:compress";

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

describe("gzip compress", () => {
  test("compress returns Uint8Array", () => {
    const result = gzip.compress(toBytes("hello"));
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  test("compress of empty string returns bytes", () => {
    const result = gzip.compress(toBytes(""));
    expect(result).toBeInstanceOf(Uint8Array);
  });

  test("compressed is smaller than original for large input", () => {
    const input = "abcdefghij".repeat(1000);
    const result = gzip.compress(toBytes(input));
    expect(result.length).toBeLessThan(input.length);
  });
});

describe("gzip decompress", () => {
  test("decompress reverses compress for 'hello'", () => {
    const compressed = gzip.compress(toBytes("hello"));
    const decompressed = gzip.decompress(compressed);
    expect(fromBytes(decompressed)).toBe("hello");
  });

  test("roundtrip with longer string", () => {
    const input = "The quick brown fox jumps over the lazy dog. ".repeat(100);
    const compressed = gzip.compress(toBytes(input));
    const decompressed = gzip.decompress(compressed);
    expect(fromBytes(decompressed)).toBe(input);
  });

  test("roundtrip with empty string", () => {
    const compressed = gzip.compress(toBytes(""));
    const decompressed = gzip.decompress(compressed);
    expect(fromBytes(decompressed)).toBe("");
  });

  test("roundtrip with single character", () => {
    const compressed = gzip.compress(toBytes("x"));
    const decompressed = gzip.decompress(compressed);
    expect(fromBytes(decompressed)).toBe("x");
  });
});

describe("gzip compression ratio", () => {
  test("highly repetitive data compresses well", () => {
    const input = "a".repeat(10000);
    const compressed = gzip.compress(toBytes(input));
    expect(compressed.length).toBeLessThan(input.length / 10);
  });

  test("compressed output is not empty for non-empty input", () => {
    const compressed = gzip.compress(toBytes("data"));
    expect(compressed.length).toBeGreaterThan(0);
  });
});
