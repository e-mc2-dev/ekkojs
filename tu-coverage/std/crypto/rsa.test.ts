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
import { rsaGenerateKeyPem, rsaSign, rsaVerify } from "ekko:crypto";

describe("rsaGenerateKeyPem", () => {
  test("generates keypair with publicKey and privateKey", () => {
    const keys = rsaGenerateKeyPem(2048);
    expect(typeof keys.publicKey).toBe("string");
    expect(typeof keys.privateKey).toBe("string");
  });

  test("publicKey contains PUBLIC KEY marker", () => {
    const keys = rsaGenerateKeyPem(2048);
    expect(keys.publicKey).toContain("PUBLIC KEY");
  });

  test("privateKey contains PRIVATE KEY marker", () => {
    const keys = rsaGenerateKeyPem(2048);
    expect(keys.privateKey).toContain("PRIVATE KEY");
  });
});

describe("rsaSign", () => {
  test("returns Uint8Array signature", () => {
    const keys = rsaGenerateKeyPem(2048);
    const sig = rsaSign(keys.privateKey, "hello rsa");
    expect(sig instanceof Uint8Array).toBe(true);
  });

  test("signature has length > 0", () => {
    const keys = rsaGenerateKeyPem(2048);
    const sig = rsaSign(keys.privateKey, "hello rsa");
    expect(sig.length).toBeGreaterThan(0);
  });

  test("sign empty message", () => {
    const keys = rsaGenerateKeyPem(2048);
    const sig = rsaSign(keys.privateKey, "");
    expect(sig instanceof Uint8Array).toBe(true);
    expect(sig.length).toBeGreaterThan(0);
  });

  test("sign long message", () => {
    const keys = rsaGenerateKeyPem(2048);
    const longMsg = "A".repeat(5000);
    const sig = rsaSign(keys.privateKey, longMsg);
    expect(sig instanceof Uint8Array).toBe(true);
    expect(sig.length).toBeGreaterThan(0);
  });
});

describe("rsaVerify", () => {
  test("verifies correct signature", () => {
    const keys = rsaGenerateKeyPem(2048);
    const sig = rsaSign(keys.privateKey, "hello rsa");
    const ok = rsaVerify(keys.publicKey, "hello rsa", sig);
    expect(ok).toBe(true);
  });

  test("rejects wrong message", () => {
    const keys = rsaGenerateKeyPem(2048);
    const sig = rsaSign(keys.privateKey, "hello rsa");
    const ok = rsaVerify(keys.publicKey, "wrong message", sig);
    expect(ok).toBe(false);
  });

  test("rejects tampered signature", () => {
    const keys = rsaGenerateKeyPem(2048);
    const sig = rsaSign(keys.privateKey, "hello rsa");
    const tampered = new Uint8Array(sig);
    tampered[0] = tampered[0] ^ 0xff;
    const ok = rsaVerify(keys.publicKey, "hello rsa", tampered);
    expect(ok).toBe(false);
  });

  test("different keypair cannot verify", () => {
    const keys1 = rsaGenerateKeyPem(2048);
    const keys2 = rsaGenerateKeyPem(2048);
    const sig = rsaSign(keys1.privateKey, "test message");
    const ok = rsaVerify(keys2.publicKey, "test message", sig);
    expect(ok).toBe(false);
  });

  test("sign and verify multiple messages with same key", () => {
    const keys = rsaGenerateKeyPem(2048);
    const sig1 = rsaSign(keys.privateKey, "msg1");
    const sig2 = rsaSign(keys.privateKey, "msg2");
    expect(rsaVerify(keys.publicKey, "msg1", sig1)).toBe(true);
    expect(rsaVerify(keys.publicKey, "msg2", sig2)).toBe(true);
    expect(rsaVerify(keys.publicKey, "msg1", sig2)).toBe(false);
  });
});
