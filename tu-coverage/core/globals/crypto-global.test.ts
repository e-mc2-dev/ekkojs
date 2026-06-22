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

describe("crypto global", () => {
  test("crypto.randomUUID returns string of length 36", () => {
    const uuid = crypto.randomUUID();
    expect(typeof uuid).toBe("string");
    expect(uuid).toHaveLength(36);
  });

  test("crypto.randomUUID has hyphens in correct positions", () => {
    const uuid = crypto.randomUUID();
    expect(uuid[8]).toBe("-");
    expect(uuid[13]).toBe("-");
    expect(uuid[18]).toBe("-");
    expect(uuid[23]).toBe("-");
  });

  test("two UUIDs are different", () => {
    const a = crypto.randomUUID();
    const b = crypto.randomUUID();
    expect(a).not.toBe(b);
  });

  test("crypto.getRandomValues fills Uint8Array", () => {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    
    let hasNonZero = false;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== 0) { hasNonZero = true; break; }
    }
    expect(hasNonZero).toBeTruthy();
  });

  test("crypto.getRandomValues returns same array reference", () => {
    const arr = new Uint8Array(8);
    const returned = crypto.getRandomValues(arr);
    expect(returned).toBe(arr);
  });
});
