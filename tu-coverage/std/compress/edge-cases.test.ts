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

describe("cross-algorithm mismatch", () => {
  test("gzip compressed data decompressed with brotli throws", () => {
    const compressed = gzip.compress(toBytes("test data"));
    let threw = false;
    try { brotli.decompress(compressed); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  test("brotli compressed data decompressed with deflate throws or returns wrong data", () => {
    const original = toBytes("test data");
    const compressed = brotli.compress(original);
    let threw = false;
    let result: Uint8Array | undefined;
    try { result = deflate.decompress(compressed); } catch { threw = true; }
    
    if (!threw) {
      expect(fromBytes(result!) !== fromBytes(original) || result!.length !== original.length).toBe(true);
    } else {
      expect(threw).toBe(true);
    }
  });

  test("deflate compressed data decompressed with gzip throws", () => {
    const compressed = deflate.compress(toBytes("test data"));
    let threw = false;
    try { gzip.decompress(compressed); } catch { threw = true; }
    expect(threw).toBe(true);
  });
});

describe("large input", () => {
  test("gzip roundtrip with 1000x repeated string", () => {
    const input = "large payload chunk ".repeat(1000);
    const compressed = gzip.compress(toBytes(input));
    const decompressed = gzip.decompress(compressed);
    expect(fromBytes(decompressed)).toBe(input);
  });

  test("brotli roundtrip with 1000x repeated string", () => {
    const input = "brotli large test ".repeat(1000);
    const compressed = brotli.compress(toBytes(input));
    const decompressed = brotli.decompress(compressed);
    expect(fromBytes(decompressed)).toBe(input);
  });

  test("deflate roundtrip with 1000x repeated string", () => {
    const input = "deflate large test ".repeat(1000);
    const compressed = deflate.compress(toBytes(input));
    const decompressed = deflate.decompress(compressed);
    expect(fromBytes(decompressed)).toBe(input);
  });
});

describe("single byte input", () => {
  test("gzip roundtrip with single byte", () => {
    const compressed = gzip.compress(toBytes("x"));
    const decompressed = gzip.decompress(compressed);
    expect(fromBytes(decompressed)).toBe("x");
  });

  test("brotli roundtrip with single byte", () => {
    const compressed = brotli.compress(toBytes("y"));
    const decompressed = brotli.decompress(compressed);
    expect(fromBytes(decompressed)).toBe("y");
  });
});

describe("binary data roundtrip", () => {
  test("gzip with Uint8Array input", () => {
    const input = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
    const compressed = gzip.compress(input);
    const decompressed = gzip.decompress(compressed);
    expect(decompressed).toBeInstanceOf(Uint8Array);
    expect(decompressed.length).toBe(input.length);
  });

  test("deflate with Uint8Array input", () => {
    const input = new Uint8Array([10, 20, 30, 40, 50]);
    const compressed = deflate.compress(input);
    const decompressed = deflate.decompress(compressed);
    expect(decompressed).toBeInstanceOf(Uint8Array);
    expect(decompressed.length).toBe(input.length);
  });
});
