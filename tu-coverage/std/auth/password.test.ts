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
import { createAuth } from "ekko:auth";

const auth = createAuth({ secret: "test-secret", sessionTTL: 3600 });

describe("hashPassword", () => {
  test("returns a string", () => {
    const hash = auth.hashPassword("password123");
    expect(typeof hash).toBe("string");
  });

  test("returns different hash each call (salt)", () => {
    const h1 = auth.hashPassword("password123");
    const h2 = auth.hashPassword("password123");
    expect(h1).not.toBe(h2);
  });

  test("hash is non-empty", () => {
    const hash = auth.hashPassword("password123");
    expect(hash.length > 0).toBe(true);
  });

  test("with empty password works", () => {
    const hash = auth.hashPassword("");
    expect(typeof hash).toBe("string");
    expect(hash.length > 0).toBe(true);
  });

  test("with long password works", () => {
    const longPw = "a".repeat(1000);
    const hash = auth.hashPassword(longPw);
    expect(typeof hash).toBe("string");
    expect(hash.length > 0).toBe(true);
  });

  test("with special chars works", () => {
    const hash = auth.hashPassword("p@$$w0rd!#%^&*(){}[]|;:',.<>?/~`");
    expect(typeof hash).toBe("string");
    expect(hash.length > 0).toBe(true);
  });

  test("different passwords produce different hashes", () => {
    const h1 = auth.hashPassword("alpha");
    const h2 = auth.hashPassword("bravo");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword", () => {
  test("with correct password returns true", () => {
    const hash = auth.hashPassword("correct-password");
    const result = auth.verifyPassword("correct-password", hash);
    expect(result).toBe(true);
  });

  test("with wrong password returns false", () => {
    const hash = auth.hashPassword("correct-password");
    const result = auth.verifyPassword("wrong-password", hash);
    expect(result).toBe(false);
  });

  test("with empty string as hash returns false", () => {
    const result = auth.verifyPassword("password", "");
    expect(result).toBe(false);
  });

  test("is consistent (call twice)", () => {
    const hash = auth.hashPassword("my-password");
    const r1 = auth.verifyPassword("my-password", hash);
    const r2 = auth.verifyPassword("my-password", hash);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
  });

  test("hash + verify roundtrip with unicode", () => {
    const pw = "éèêëàâäüöß你好世界🚀";
    const hash = auth.hashPassword(pw);
    expect(auth.verifyPassword(pw, hash)).toBe(true);
    expect(auth.verifyPassword("wrong", hash)).toBe(false);
  });
});
