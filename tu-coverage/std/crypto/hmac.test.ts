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
import { hmac } from "ekko:crypto";

describe("hmac", () => {
  test("sha256 hmac returns Uint8Array of 32 bytes", () => {
    const m = hmac("sha256", "key", "data");
    expect(m instanceof Uint8Array).toBe(true);
    expect(m.length).toBe(32);
  });

  test("sha384 hmac returns 48 bytes", () => {
    const m = hmac("sha384", "key", "data");
    expect(m.length).toBe(48);
  });

  test("sha512 hmac returns 64 bytes", () => {
    const m = hmac("sha512", "key", "data");
    expect(m.length).toBe(64);
  });

  test("same inputs produce same hmac", () => {
    const m1 = hmac("sha256", "secret", "message");
    const m2 = hmac("sha256", "secret", "message");
    expect(m1[0]).toBe(m2[0]);
    expect(m1[15]).toBe(m2[15]);
    expect(m1[31]).toBe(m2[31]);
  });

  test("different key produces different hmac", () => {
    const m1 = hmac("sha256", "key1", "data");
    const m2 = hmac("sha256", "key2", "data");
    let same = true;
    for (let i = 0; i < 32; i++) {
      if (m1[i] !== m2[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  test("different data produces different hmac", () => {
    const m1 = hmac("sha256", "key", "data1");
    const m2 = hmac("sha256", "key", "data2");
    let same = true;
    for (let i = 0; i < 32; i++) {
      if (m1[i] !== m2[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  test("empty data hmac", () => {
    const m = hmac("sha256", "key", "");
    expect(m instanceof Uint8Array).toBe(true);
    expect(m.length).toBe(32);
  });

  test("empty key hmac", () => {
    const m = hmac("sha256", "", "data");
    expect(m instanceof Uint8Array).toBe(true);
    expect(m.length).toBe(32);
  });
});
