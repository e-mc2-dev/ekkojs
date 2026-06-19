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
import { generateKey, encrypt, decrypt } from "ekko:crypto";

describe("generateKey", () => {
  test("aes-256-gcm returns 32-byte key", () => {
    const key = generateKey("aes-256-gcm");
    expect(key instanceof Uint8Array).toBe(true);
    expect(key.length).toBe(32);
  });

  test("aes-256-cbc returns 32-byte key", () => {
    const key = generateKey("aes-256-cbc");
    expect(key.length).toBe(32);
  });

  test("aes-128-gcm returns 16-byte key", () => {
    const key = generateKey("aes-128-gcm");
    expect(key.length).toBe(16);
  });
});

describe("AES-256-GCM encrypt/decrypt", () => {
  test("roundtrip produces original plaintext", () => {
    const key = generateKey("aes-256-gcm");
    const encrypted = encrypt("aes-256-gcm", key, "hello world");
    const decrypted = decrypt("aes-256-gcm", key, encrypted);
    expect(String.fromCharCode(...decrypted)).toBe("hello world");
  });

  test("encrypted data differs from plaintext", () => {
    const key = generateKey("aes-256-gcm");
    const encrypted = encrypt("aes-256-gcm", key, "hello world");
    const plainBytes = new Uint8Array("hello world".length);
    for (let i = 0; i < "hello world".length; i++) plainBytes[i] = "hello world".charCodeAt(i);
    let same = encrypted.length === plainBytes.length;
    if (same) {
      for (let i = 0; i < encrypted.length; i++) {
        if (encrypted[i] !== plainBytes[i]) { same = false; break; }
      }
    }
    expect(same).toBe(false);
  });

  test("encrypted data has length > 0", () => {
    const key = generateKey("aes-256-gcm");
    const encrypted = encrypt("aes-256-gcm", key, "test");
    expect(encrypted.length).toBeGreaterThan(0);
  });

  test("empty plaintext roundtrip", () => {
    const key = generateKey("aes-256-gcm");
    const encrypted = encrypt("aes-256-gcm", key, "");
    const decrypted = decrypt("aes-256-gcm", key, encrypted);
    expect(String.fromCharCode(...decrypted)).toBe("");
  });

  test("long plaintext roundtrip", () => {
    const key = generateKey("aes-256-gcm");
    const longText = "A".repeat(1000);
    const encrypted = encrypt("aes-256-gcm", key, longText);
    const decrypted = decrypt("aes-256-gcm", key, encrypted);
    expect(String.fromCharCode(...decrypted)).toBe(longText);
  });
});

describe("AES-256-CBC encrypt/decrypt", () => {
  test("roundtrip produces original plaintext", () => {
    const key = generateKey("aes-256-cbc");
    const encrypted = encrypt("aes-256-cbc", key, "secret data");
    const decrypted = decrypt("aes-256-cbc", key, encrypted);
    expect(String.fromCharCode(...decrypted)).toBe("secret data");
  });

  test("encrypted data has length > 0", () => {
    const key = generateKey("aes-256-cbc");
    const encrypted = encrypt("aes-256-cbc", key, "test");
    expect(encrypted.length).toBeGreaterThan(0);
  });
});

describe("AES-128-GCM encrypt/decrypt", () => {
  test("roundtrip produces original plaintext", () => {
    const key = generateKey("aes-128-gcm");
    const encrypted = encrypt("aes-128-gcm", key, "test128");
    const decrypted = decrypt("aes-128-gcm", key, encrypted);
    expect(String.fromCharCode(...decrypted)).toBe("test128");
  });
});

describe("wrong key decryption", () => {
  test("wrong key fails to produce correct plaintext", () => {
    const key1 = generateKey("aes-256-gcm");
    const key2 = generateKey("aes-256-gcm");
    const encrypted = encrypt("aes-256-gcm", key1, "secret");
    let failed = false;
    try {
      const decrypted = decrypt("aes-256-gcm", key2, encrypted);
      const text = String.fromCharCode(...decrypted);
      if (text !== "secret") failed = true;
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});
