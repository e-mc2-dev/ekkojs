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
import { Regex } from "ekko:text/regex";

describe("Regex edge cases", () => {
  test("empty string pattern matches everything", () => {
    const re = Regex("");
    expect(re.test("anything")).toBe(true);
    re.dispose();
  });

  test("pattern with special regex characters", () => {
    const re = Regex("\\$\\d+\\.\\d+");
    expect(re.test("price $9.99")).toBe(true);
    expect(re.test("no price")).toBe(false);
    re.dispose();
  });

  test("unicode in pattern", () => {
    const re = Regex("café");
    expect(re.test("I love café")).toBe(true);
    re.dispose();
  });

  test("very long input string", () => {
    const re = Regex("needle");
    const hay = "x".repeat(10000) + "needle" + "x".repeat(10000);
    expect(re.test(hay)).toBe(true);
    re.dispose();
  });

  test("no match returns null from match()", () => {
    const re = Regex("impossible_pattern_xyz_123");
    const m = re.match("simple text");
    expect(m).toBeNull();
    re.dispose();
  });

  test("matchAll with no matches returns empty array", () => {
    const re = Regex("zzz");
    const all = re.matchAll("abc def ghi");
    expect(all).toHaveLength(0);
    re.dispose();
  });

  test("dispose does not crash", () => {
    const re = Regex("abc");
    re.dispose();
    expect(true).toBe(true);
  });

  test("named capture groups", () => {
    const re = Regex("(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})");
    const m = re.match("date: 2026-05-04");
    expect(m.groups.year).toBe("2026");
    expect(m.groups.month).toBe("05");
    expect(m.groups.day).toBe("04");
    re.dispose();
  });
});
