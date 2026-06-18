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
import * as dtMod from "ekko:datetime";

const { datetime } = dtMod;

describe("datetime.parse", () => {
  test("parses ISO date string", () => {
    const parsed = datetime.parse("2024-01-15T10:30:00Z");
    expect(parsed.iso).toContain("2024-01-15");
  });

  test("parsed object has iso field", () => {
    const parsed = datetime.parse("2026-05-02T14:30:00Z");
    expect(typeof parsed.iso).toBe("string");
  });

  test("parsed iso contains the date", () => {
    const parsed = datetime.parse("2026-05-02T14:30:00Z");
    expect(parsed.iso).toContain("2026-05-02");
  });

  test("parsed object has epoch field", () => {
    const parsed = datetime.parse("2026-05-02T14:30:00Z");
    expect(typeof parsed.epoch).toBe("number");
    expect(parsed.epoch).toBeGreaterThan(0);
  });

  test("parses date with timezone offset", () => {
    const parsed = datetime.parse("2024-06-15T08:00:00+05:00");
    expect(parsed.iso).toContain("2024-06-15");
  });
});

describe("datetime.format", () => {
  test("formats parsed date to yyyy-MM-dd", () => {
    const parsed = datetime.parse("2026-05-02T14:30:00Z");
    const fmt = datetime.format(parsed, "yyyy-MM-dd");
    expect(fmt).toBe("2026-05-02");
  });

  test("format returns a string", () => {
    const parsed = datetime.parse("2024-01-15T10:30:00Z");
    const fmt = datetime.format(parsed, "yyyy-MM-dd");
    expect(typeof fmt).toBe("string");
  });

  test("format preserves year", () => {
    const parsed = datetime.parse("1999-12-31T23:59:59Z");
    const fmt = datetime.format(parsed, "yyyy-MM-dd");
    expect(fmt).toContain("1999");
  });

  test("parse then format roundtrip", () => {
    const parsed = datetime.parse("2026-05-04T00:00:00Z");
    const fmt = datetime.format(parsed, "yyyy-MM-dd");
    expect(fmt).toBe("2026-05-04");
  });

  test("format with different pattern", () => {
    const parsed = datetime.parse("2026-05-02T14:30:00Z");
    const fmt = datetime.format(parsed, "yyyy/MM/dd");
    expect(fmt).toContain("2026");
    expect(fmt).toContain("05");
    expect(fmt).toContain("02");
  });
});
