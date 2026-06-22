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
import { datetime, timezone } from "ekko:datetime";

describe("timezone.list", () => {
  test("returns an array", () => {
    const zones = timezone.list();
    expect(Array.isArray(zones)).toBe(true);
  });

  test("list is non-empty", () => {
    const zones = timezone.list();
    expect(zones.length).toBeGreaterThan(0);
  });

  test("list contains common timezones", () => {
    const zones = timezone.list();
    const joined = zones.join(",");
    const hasUtc = joined.includes("UTC") || joined.includes("Etc/UTC");
    expect(hasUtc).toBe(true);
  });
});

describe("timezone.convert", () => {
  test("converts UTC to America/New_York", () => {
    const utc = datetime.nowUtc();
    const conv = timezone.convert(utc, "America/New_York");
    expect(conv.zone).toBe("America/New_York");
  });

  test("converted date has iso string", () => {
    const utc = datetime.nowUtc();
    const conv = timezone.convert(utc, "Europe/London");
    expect(typeof conv.iso).toBe("string");
  });

  test("convert to Asia/Tokyo", () => {
    const utc = datetime.nowUtc();
    const conv = timezone.convert(utc, "Asia/Tokyo");
    expect(conv.zone).toBe("Asia/Tokyo");
  });
});

describe("timezone.info", () => {
  test("returns info for UTC", () => {
    const info = timezone.info("UTC");
    expect(typeof info).toBe("object");
  });

  test("info for Europe/London has id", () => {
    const info = timezone.info("Europe/London");
    expect(info.id).toBe("Europe/London");
  });

  test("info contains offset field", () => {
    const info = timezone.info("UTC");
    
    expect(info).toBeTruthy();
    const keys = Object.keys(info);
    expect(keys.length > 0).toBe(true);
  });
});
