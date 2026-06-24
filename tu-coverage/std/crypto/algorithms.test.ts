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
import { hash, hashHex, hmac, generateKey, encrypt, decrypt, pbkdf2, hkdf } from "ekko:crypto";

describe("hash algorithm edge cases", () => {
  test("sha256 of empty string produces known 64-char hex", () => {
    const hex = hashHex("sha256", "");
    
    expect(hex).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  test("sha256 is deterministic (same input same output)", () => {
    const h1 = hashHex("sha256", "deterministic test");
    const h2 = hashHex("sha256", "deterministic test");
    expect(h1).toBe(h2);
  });

  test("hashHex sha256 contains only hex chars [0-9a-f]", () => {
    const hex = hashHex("sha256", "any input here");
    expect(hex).toMatch(/^[0-9a-f]+$/);
    expect(hex.length).toBe(64);
  });

  test("hash of Uint8Array input works", () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]); 
    const h = hash("sha256", data);
    expect(h instanceof Uint8Array).toBe(true);
    expect(h.length).toBe(32);
  });
});

describe("hmac edge cases", () => {
  test("hmac with empty key still produces valid output", () => {
    const m = hmac("sha256", "", "data");
    expect(m instanceof Uint8Array).toBe(true);
    expect(m.length).toBe(32);
  });

  test("hmac with empty data still produces valid output", () => {
    const m = hmac("sha256", "key", "");
    expect(m instanceof Uint8Array).toBe(true);
    expect(m.length).toBe(32);
  });
});

describe("encrypt/decrypt advanced", () => {
  test("encrypt/decrypt with binary data (Uint8Array input)", () => {
    const key = generateKey("aes-256-gcm");
    const plaintext = new Uint8Array([0, 1, 2, 128, 254, 255]);
    const encrypted = encrypt("aes-256-gcm", key, plaintext);
    const decrypted = decrypt("aes-256-gcm", key, encrypted);
    expect(decrypted.length).toBe(6);
    expect(decrypted[0]).toBe(0);
    expect(decrypted[3]).toBe(128);
    expect(decrypted[5]).toBe(255);
  });

  test("encrypt same plaintext twice produces different ciphertext (random IV)", () => {
    const key = generateKey("aes-256-gcm");
    const e1 = encrypt("aes-256-gcm", key, "same plaintext");
    const e2 = encrypt("aes-256-gcm", key, "same plaintext");
    
    let same = e1.length === e2.length;
    if (same) {
      for (let i = 0; i < e1.length; i++) {
        if (e1[i] !== e2[i]) { same = false; break; }
      }
    }
    expect(same).toBe(false);
  });

  test("large plaintext (10KB) encrypt/decrypt roundtrip", () => {
    const key = generateKey("aes-256-gcm");
    const longText = "X".repeat(10 * 1024);
    const encrypted = encrypt("aes-256-gcm", key, longText);
    const decrypted = decrypt("aes-256-gcm", key, encrypted);
    expect(String.fromCharCode(...decrypted)).toBe(longText);
  });

  test("multiple sequential encrypt/decrypt operations", () => {
    const key = generateKey("aes-256-gcm");
    for (let i = 0; i < 10; i++) {
      const text = "iteration_" + i;
      const encrypted = encrypt("aes-256-gcm", key, text);
      const decrypted = decrypt("aes-256-gcm", key, encrypted);
      expect(String.fromCharCode(...decrypted)).toBe(text);
    }
  });
});

describe("generateKey edge cases", () => {
  test("generateKey returns different key each call", () => {
    const k1 = generateKey("aes-256-gcm");
    const k2 = generateKey("aes-256-gcm");
    let same = true;
    for (let i = 0; i < 32; i++) {
      if (k1[i] !== k2[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  test("AES-256-GCM key is exactly 32 bytes", () => {
    const key = generateKey("aes-256-gcm");
    expect(key.length).toBe(32);
    expect(key instanceof Uint8Array).toBe(true);
  });

  test("AES-128-GCM key is exactly 16 bytes", () => {
    const key = generateKey("aes-128-gcm");
    expect(key.length).toBe(16);
    expect(key instanceof Uint8Array).toBe(true);
  });
});

describe("PBKDF2 and HKDF edge cases", () => {
  test("PBKDF2 with different iteration counts produces different results", () => {
    const dk1 = pbkdf2("password", "salt", 1000, "sha256", 32);
    const dk2 = pbkdf2("password", "salt", 5000, "sha256", 32);
    let same = true;
    for (let i = 0; i < 32; i++) {
      if (dk1[i] !== dk2[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  test("HKDF with different output lengths works", () => {
    const hk16 = hkdf("input-key", "salt", "info", "sha256", 16);
    const hk64 = hkdf("input-key", "salt", "info", "sha256", 64);
    expect(hk16.length).toBe(16);
    expect(hk64.length).toBe(64);
    
    let prefixMatch = true;
    for (let i = 0; i < 16; i++) {
      if (hk16[i] !== hk64[i]) { prefixMatch = false; break; }
    }
    expect(prefixMatch).toBe(true);
  });
});
