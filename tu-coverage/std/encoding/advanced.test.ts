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

describe("base64 encode/decode binary with all byte values", () => {
  test("roundtrip all byte values 0-255", () => {
    const input = new Uint8Array(256);
    for (let i = 0; i < 256; i++) input[i] = i;
    const encoded = encoding.base64.encode(input);
    const decoded = encoding.base64.decode(encoded);
    expect(decoded.length).toBe(256);
    expect(decoded[0]).toBe(0);
    expect(decoded[127]).toBe(127);
    expect(decoded[255]).toBe(255);
  });
});

describe("hex encoding edge cases", () => {
  test("hex encode produces lowercase only", () => {
    const bytes = new Uint8Array([0xAB, 0xCD, 0xEF, 0x12, 0x34]);
    const hex = encoding.hex.encode(bytes);
    expect(hex).toMatch(/^[0-9a-f]+$/);
    expect(hex).not.toMatch(/[A-F]/);
  });

  test("hex encode of [0, 1, 254, 255] = '0001feff'", () => {
    const bytes = new Uint8Array([0, 1, 254, 255]);
    const hex = encoding.hex.encode(bytes);
    expect(hex).toBe("0001feff");
  });

  test("hex encode of large data (10KB)", () => {
    const size = 10 * 1024;
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) data[i] = i % 256;
    const hex = encoding.hex.encode(data);
    expect(hex.length).toBe(size * 2);
    expect(hex).toMatch(/^[0-9a-f]+$/);
  });
});

describe("utf8 encoding edge cases", () => {
  test("utf8 encode of emoji produces 4 bytes", () => {
    
    const result = encoding.utf8.encode("\u{1F600}");
    expect(result.length).toBe(4);
  });

  test("utf8 encode of ASCII char produces 1 byte", () => {
    const result = encoding.utf8.encode("A");
    expect(result.length).toBe(1);
    expect(result[0]).toBe(65);
  });

  test("utf8 roundtrip of various scripts (Latin, Cyrillic, CJK)", () => {
    const latin = "Hello World";
    const cyrillic = "Привет";
    const cjk = "你好世界";
    const all = latin + " " + cyrillic + " " + cjk;
    const encoded = encoding.utf8.encode(all);
    const decoded = encoding.utf8.decode(encoded);
    expect(decoded).toBe(all);
  });
});

describe("utf16 encoding edge cases", () => {
  test("utf16 encode of ASCII produces 2 bytes per char", () => {
    const result = encoding.utf16.encode("AB");
    expect(result.length).toBe(4);
  });
});

describe("base64 large data", () => {
  test("base64 encode of large data (10KB)", () => {
    const size = 10 * 1024;
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) data[i] = i % 256;
    const encoded = encoding.base64.encode(data);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
    
    const decoded = encoding.base64.decode(encoded);
    expect(decoded.length).toBe(size);
  });
});

describe("base64url safety", () => {
  test("base64url does not contain + or /", () => {
    
    const input = new Uint8Array([0xFF, 0xFE, 0xFD, 0xFC, 0xFB, 0xFA, 0x3E, 0x3F]);
    const encoded = encoding.base64.encodeUrl(input);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
  });
});

describe("multiple encode/decode cycles", () => {
  test("multiple base64 cycles produce same result", () => {
    const original = "test data for cycling";
    const encoded = encoding.base64.encode(original);
    const decoded = encoding.utf8.decode(encoding.base64.decode(encoded));
    expect(decoded).toBe(original);
    
    const encoded2 = encoding.base64.encode(decoded);
    expect(encoded2).toBe(encoded);
  });

  test("multiple hex cycles produce same result", () => {
    const original = new Uint8Array([10, 20, 30, 40, 50]);
    const hex = encoding.hex.encode(original);
    const decoded = encoding.hex.decode(hex);
    const hex2 = encoding.hex.encode(decoded);
    expect(hex2).toBe(hex);
  });
});

describe("empty byte array encode/decode roundtrip", () => {
  test("base64 empty roundtrip", () => {
    const empty = new Uint8Array(0);
    const encoded = encoding.base64.encode(empty);
    expect(encoded).toBe("");
    const decoded = encoding.base64.decode(encoded);
    expect(decoded.length).toBe(0);
  });

  test("hex empty roundtrip", () => {
    const empty = new Uint8Array(0);
    const encoded = encoding.hex.encode(empty);
    expect(encoded).toBe("");
    const decoded = encoding.hex.decode(encoded);
    expect(decoded.length).toBe(0);
  });

  test("utf8 empty roundtrip", () => {
    const encoded = encoding.utf8.encode("");
    expect(encoded.length).toBe(0);
    const decoded = encoding.utf8.decode(encoded);
    expect(decoded).toBe("");
  });
});
