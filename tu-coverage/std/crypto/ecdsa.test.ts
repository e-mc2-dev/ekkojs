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
import { ecdsaGenerateKeyPem, ecdsaSign, ecdsaVerify } from "ekko:crypto";

describe("ecdsaGenerateKeyPem", () => {
  test("P-256 generates keypair", () => {
    const keys = ecdsaGenerateKeyPem("P-256");
    expect(typeof keys.publicKey).toBe("string");
    expect(typeof keys.privateKey).toBe("string");
  });

  test("publicKey contains PUBLIC KEY marker", () => {
    const keys = ecdsaGenerateKeyPem("P-256");
    expect(keys.publicKey).toContain("PUBLIC KEY");
  });

  test("privateKey contains PRIVATE KEY or EC PRIVATE KEY marker", () => {
    const keys = ecdsaGenerateKeyPem("P-256");
    expect(keys.privateKey).toContain("PRIVATE KEY");
  });
});

describe("ecdsaSign", () => {
  test("returns Uint8Array signature", () => {
    const keys = ecdsaGenerateKeyPem("P-256");
    const sig = ecdsaSign(keys.privateKey, "hello ecdsa");
    expect(sig instanceof Uint8Array).toBe(true);
  });

  test("signature has length > 0", () => {
    const keys = ecdsaGenerateKeyPem("P-256");
    const sig = ecdsaSign(keys.privateKey, "hello ecdsa");
    expect(sig.length).toBeGreaterThan(0);
  });
});

describe("ecdsaVerify", () => {
  test("verifies correct signature", () => {
    const keys = ecdsaGenerateKeyPem("P-256");
    const sig = ecdsaSign(keys.privateKey, "hello ecdsa");
    const ok = ecdsaVerify(keys.publicKey, "hello ecdsa", sig);
    expect(ok).toBe(true);
  });

  test("rejects wrong message", () => {
    const keys = ecdsaGenerateKeyPem("P-256");
    const sig = ecdsaSign(keys.privateKey, "hello ecdsa");
    const ok = ecdsaVerify(keys.publicKey, "wrong message", sig);
    expect(ok).toBe(false);
  });

  test("rejects tampered signature", () => {
    const keys = ecdsaGenerateKeyPem("P-256");
    const sig = ecdsaSign(keys.privateKey, "hello ecdsa");
    const tampered = new Uint8Array(sig);
    tampered[0] = tampered[0] ^ 0xff;
    const ok = ecdsaVerify(keys.publicKey, "hello ecdsa", tampered);
    expect(ok).toBe(false);
  });

  test("different keypair cannot verify", () => {
    const keys1 = ecdsaGenerateKeyPem("P-256");
    const keys2 = ecdsaGenerateKeyPem("P-256");
    const sig = ecdsaSign(keys1.privateKey, "test");
    const ok = ecdsaVerify(keys2.publicKey, "test", sig);
    expect(ok).toBe(false);
  });

  test("sign/verify roundtrip with various messages", () => {
    const keys = ecdsaGenerateKeyPem("P-256");
    const messages = ["short", "a longer message with spaces", "special chars: !@#$%", ""];
    for (const msg of messages) {
      const sig = ecdsaSign(keys.privateKey, msg);
      const ok = ecdsaVerify(keys.publicKey, msg, sig);
      expect(ok).toBe(true);
    }
  });

  test("P-384 curve key generation", () => {
    const keys = ecdsaGenerateKeyPem("P-384");
    expect(typeof keys.publicKey).toBe("string");
    expect(keys.publicKey).toContain("PUBLIC KEY");
    const sig = ecdsaSign(keys.privateKey, "test384");
    const ok = ecdsaVerify(keys.publicKey, "test384", sig);
    expect(ok).toBe(true);
  });
});
