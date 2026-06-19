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
import { hash, hashHex } from "ekko:crypto";

describe("hash", () => {
  test("sha256 returns Uint8Array of 32 bytes", () => {
    const h = hash("sha256", "hello");
    expect(h instanceof Uint8Array).toBe(true);
    expect(h.length).toBe(32);
  });

  test("sha384 returns 48 bytes", () => {
    const h = hash("sha384", "hello");
    expect(h.length).toBe(48);
  });

  test("sha512 returns 64 bytes", () => {
    const h = hash("sha512", "hello");
    expect(h.length).toBe(64);
  });

  test("same input produces same sha256 hash", () => {
    const h1 = hash("sha256", "deterministic");
    const h2 = hash("sha256", "deterministic");
    expect(h1[0]).toBe(h2[0]);
    expect(h1[15]).toBe(h2[15]);
    expect(h1[31]).toBe(h2[31]);
  });

  test("different input produces different sha256 hash", () => {
    const h1 = hash("sha256", "hello");
    const h2 = hash("sha256", "world");
    let same = true;
    for (let i = 0; i < 32; i++) {
      if (h1[i] !== h2[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  test("empty string sha256 hash", () => {
    const h = hash("sha256", "");
    expect(h instanceof Uint8Array).toBe(true);
    expect(h.length).toBe(32);
  });
});

describe("hashHex", () => {
  test("sha256 returns 64-char hex string", () => {
    const hex = hashHex("sha256", "hello");
    expect(typeof hex).toBe("string");
    expect(hex.length).toBe(64);
  });

  test("sha384 returns 96-char hex string", () => {
    const hex = hashHex("sha384", "hello");
    expect(hex.length).toBe(96);
  });

  test("sha512 returns 128-char hex string", () => {
    const hex = hashHex("sha512", "hello");
    expect(hex.length).toBe(128);
  });

  test("hex string contains only valid hex chars", () => {
    const hex = hashHex("sha256", "test");
    expect(hex).toMatch(/^[0-9a-f]+$/);
  });

  test("same input produces same hex", () => {
    const h1 = hashHex("sha256", "consistent");
    const h2 = hashHex("sha256", "consistent");
    expect(h1).toBe(h2);
  });

  test("empty string hex hash", () => {
    const hex = hashHex("sha256", "");
    expect(typeof hex).toBe("string");
    expect(hex.length).toBe(64);
  });
});
