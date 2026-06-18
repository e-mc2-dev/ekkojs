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
import { datetime } from "ekko:datetime";

describe("datetime.now", () => {
  test("returns an object with iso string", () => {
    const now = datetime.now();
    expect(typeof now.iso).toBe("string");
  });

  test("iso contains T separator (ISO format)", () => {
    const now = datetime.now();
    expect(now.iso.includes("T")).toBe(true);
  });

  test("has epoch as number", () => {
    const now = datetime.now();
    expect(typeof now.epoch).toBe("number");
    expect(now.epoch).toBeGreaterThan(0);
  });

  test("two now() calls: second epoch >= first", () => {
    const first = datetime.now();
    const second = datetime.now();
    expect(second.epoch >= first.epoch).toBe(true);
  });
});

describe("datetime.nowUtc", () => {
  test("returns an object with iso string", () => {
    const utc = datetime.nowUtc();
    expect(typeof utc.iso).toBe("string");
  });

  test("offset is +00:00", () => {
    const utc = datetime.nowUtc();
    expect(utc.offset).toBe("+00:00");
  });
});
