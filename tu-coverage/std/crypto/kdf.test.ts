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
import { pbkdf2, hkdf } from "ekko:crypto";

describe("pbkdf2", () => {
  test("returns Uint8Array of requested length (32)", () => {
    const dk = pbkdf2("password", "salt", 1000, "sha256", 32);
    expect(dk instanceof Uint8Array).toBe(true);
    expect(dk.length).toBe(32);
  });

  test("is deterministic", () => {
    const dk1 = pbkdf2("password", "salt", 1000, "sha256", 32);
    const dk2 = pbkdf2("password", "salt", 1000, "sha256", 32);
    expect(dk1[0]).toBe(dk2[0]);
    expect(dk1[15]).toBe(dk2[15]);
    expect(dk1[31]).toBe(dk2[31]);
  });

  test("different iterations produce different output", () => {
    const dk1 = pbkdf2("password", "salt", 1000, "sha256", 32);
    const dk2 = pbkdf2("password", "salt", 2000, "sha256", 32);
    let same = true;
    for (let i = 0; i < 32; i++) {
      if (dk1[i] !== dk2[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  test("different salt produces different output", () => {
    const dk1 = pbkdf2("password", "salt1", 1000, "sha256", 32);
    const dk2 = pbkdf2("password", "salt2", 1000, "sha256", 32);
    let same = true;
    for (let i = 0; i < 32; i++) {
      if (dk1[i] !== dk2[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  test("different password produces different output", () => {
    const dk1 = pbkdf2("pass1", "salt", 1000, "sha256", 32);
    const dk2 = pbkdf2("pass2", "salt", 1000, "sha256", 32);
    let same = true;
    for (let i = 0; i < 32; i++) {
      if (dk1[i] !== dk2[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });
});

describe("hkdf", () => {
  test("returns Uint8Array of requested length (64)", () => {
    const hk = hkdf("input-key", "salt", "info", "sha256", 64);
    expect(hk instanceof Uint8Array).toBe(true);
    expect(hk.length).toBe(64);
  });

  test("is deterministic", () => {
    const hk1 = hkdf("input-key", "salt", "info", "sha256", 64);
    const hk2 = hkdf("input-key", "salt", "info", "sha256", 64);
    expect(hk1[0]).toBe(hk2[0]);
    expect(hk1[32]).toBe(hk2[32]);
    expect(hk1[63]).toBe(hk2[63]);
  });

  test("different info produces different output", () => {
    const hk1 = hkdf("input-key", "salt", "info1", "sha256", 64);
    const hk2 = hkdf("input-key", "salt", "info2", "sha256", 64);
    let same = true;
    for (let i = 0; i < 64; i++) {
      if (hk1[i] !== hk2[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  test("different requested length produces different length output", () => {
    const hk32 = hkdf("input-key", "salt", "info", "sha256", 32);
    const hk64 = hkdf("input-key", "salt", "info", "sha256", 64);
    expect(hk32.length).toBe(32);
    expect(hk64.length).toBe(64);
  });

  test("different salt produces different output", () => {
    const hk1 = hkdf("input-key", "saltA", "info", "sha256", 32);
    const hk2 = hkdf("input-key", "saltB", "info", "sha256", 32);
    let same = true;
    for (let i = 0; i < 32; i++) {
      if (hk1[i] !== hk2[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });
});
