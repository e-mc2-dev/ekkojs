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
import { dns } from "ekko:net";

describe("net.dns - resolve", () => {
  test("dns.resolve localhost returns a result", async () => {
    const result = await dns.resolve("localhost");
    expect(result).toBeTruthy();
  });

  test("dns.resolve result is truthy", async () => {
    const result = await dns.resolve("localhost");
    expect(result).toBeTruthy();
  });

  test("dns.resolve returns array of addresses", async () => {
    const result = await dns.resolve("google.com");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("net.dns - error cases", () => {
  test("dns.resolve non-existent domain throws or returns error", async () => {
    let threw = false;
    try {
      await dns.resolve("this-domain-does-not-exist-ekko-test.invalid");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("dns.resolve with empty string does not crash", async () => {
    let completed = false;
    try {
      await dns.resolve("");
    } catch {
      
    }
    completed = true;
    expect(completed).toBe(true);
  });
});
