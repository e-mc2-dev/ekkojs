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
import { gzip, brotli, deflate } from "ekko:compress";

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

const tenKB = "The quick brown fox jumps over the lazy dog. ".repeat(228);

describe("gzip large data", () => {
  test("gzip compress 10KB of repeated text, verify smaller than original", () => {
    const input = toBytes(tenKB);
    const compressed = gzip.compress(input);
    expect(compressed.length).toBeLessThan(input.length);
  });

  test("gzip roundtrip 10KB", () => {
    const input = toBytes(tenKB);
    const compressed = gzip.compress(input);
    const decompressed = gzip.decompress(compressed);
    expect(fromBytes(decompressed)).toBe(tenKB);
  });
});

describe("brotli large data", () => {
  test("brotli compress 10KB, verify smaller", () => {
    const input = toBytes(tenKB);
    const compressed = brotli.compress(input);
    expect(compressed.length).toBeLessThan(input.length);
  });

  test("brotli roundtrip 10KB", () => {
    const input = toBytes(tenKB);
    const compressed = brotli.compress(input);
    const decompressed = brotli.decompress(compressed);
    expect(fromBytes(decompressed)).toBe(tenKB);
  });
});

describe("deflate large data", () => {
  test("deflate compress 10KB, verify smaller", () => {
    const input = toBytes(tenKB);
    const compressed = deflate.compress(input);
    expect(compressed.length).toBeLessThan(input.length);
  });

  test("deflate roundtrip 10KB", () => {
    const input = toBytes(tenKB);
    const compressed = deflate.compress(input);
    const decompressed = deflate.decompress(compressed);
    expect(fromBytes(decompressed)).toBe(tenKB);
  });
});

describe("compression ratio", () => {
  test("repeated data compresses well (better than 10:1)", () => {
    const input = "a".repeat(10240);
    const gzipped = gzip.compress(toBytes(input));
    const brotlied = brotli.compress(toBytes(input));
    const deflated = deflate.compress(toBytes(input));
    expect(gzipped.length).toBeLessThan(input.length / 10);
    expect(brotlied.length).toBeLessThan(input.length / 10);
    expect(deflated.length).toBeLessThan(input.length / 10);
  });

  test("random-like data compresses less but still works roundtrip", () => {
    
    const size = 10240;
    const data = new Uint8Array(size);
    let seed = 12345;
    for (let i = 0; i < size; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = seed % 256;
    }
    const compressed = gzip.compress(data);
    
    const decompressed = gzip.decompress(compressed);
    expect(decompressed.length).toBe(size);
    expect(decompressed[0]).toBe(data[0]);
    expect(decompressed[size - 1]).toBe(data[size - 1]);
  });
});
