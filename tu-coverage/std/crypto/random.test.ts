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
import { randomBytes, randomUUID } from "ekko:crypto";

describe("randomBytes", () => {
  test("returns Uint8Array of requested length (16)", () => {
    const rb = randomBytes(16);
    expect(rb instanceof Uint8Array).toBe(true);
    expect(rb.length).toBe(16);
  });

  test("returns 32 bytes when requested", () => {
    const rb = randomBytes(32);
    expect(rb.length).toBe(32);
  });

  test("returns 1 byte when requested", () => {
    const rb = randomBytes(1);
    expect(rb.length).toBe(1);
  });

  test("two calls return different data", () => {
    const a = randomBytes(32);
    const b = randomBytes(32);
    let same = true;
    for (let i = 0; i < 32; i++) {
      if (a[i] !== b[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });
});

describe("randomUUID", () => {
  test("returns 36-character string", () => {
    const uuid = randomUUID();
    expect(typeof uuid).toBe("string");
    expect(uuid.length).toBe(36);
  });

  test("has correct format 8-4-4-4-12", () => {
    const uuid = randomUUID();
    const parts = uuid.split("-");
    expect(parts).toHaveLength(5);
    expect(parts[0].length).toBe(8);
    expect(parts[1].length).toBe(4);
    expect(parts[2].length).toBe(4);
    expect(parts[3].length).toBe(4);
    expect(parts[4].length).toBe(12);
  });

  test("two UUIDs are different", () => {
    const u1 = randomUUID();
    const u2 = randomUUID();
    expect(u1).not.toBe(u2);
  });

  test("contains only hex chars and hyphens", () => {
    const uuid = randomUUID();
    expect(uuid).toMatch(/^[0-9a-f-]+$/);
  });
});
