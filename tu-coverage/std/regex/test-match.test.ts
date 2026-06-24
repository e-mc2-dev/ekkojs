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

describe("Regex.test", () => {
  test("returns true for matching input", () => {
    const re = Regex("abc");
    expect(re.test("xyzabcxyz")).toBe(true);
    re.dispose();
  });

  test("returns false for non-matching input", () => {
    const re = Regex("abc");
    expect(re.test("xyz")).toBe(false);
    re.dispose();
  });

  test("case insensitive test", () => {
    const re = Regex("hello", "i");
    expect(re.test("HELLO WORLD")).toBe(true);
    re.dispose();
  });

  test("digit pattern matches numbers", () => {
    const re = Regex("\\d+");
    expect(re.test("abc123def")).toBe(true);
    expect(re.test("no digits")).toBe(false);
    re.dispose();
  });

  test("word boundary matching", () => {
    const re = Regex("\\bcat\\b");
    expect(re.test("the cat sat")).toBe(true);
    expect(re.test("concatenate")).toBe(false);
    re.dispose();
  });
});

describe("Regex.match", () => {
  test("returns match info for matching input", () => {
    const re = Regex("(\\w+)@(\\w+\\.\\w+)");
    const m = re.match("email: alice@example.com here");
    expect(m).toBeTruthy();
    expect(m.value).toBe("alice@example.com");
    re.dispose();
  });

  test("match includes index", () => {
    const re = Regex("world");
    const m = re.match("hello world");
    expect(m).toBeTruthy();
    expect(m.index).toBe(6);
    re.dispose();
  });

  test("match includes capture groups", () => {
    const re = Regex("(\\d+)-(\\d+)");
    const m = re.match("code 42-99 here");
    expect(m.groups[0]).toBe("42");
    expect(m.groups[1]).toBe("99");
    re.dispose();
  });

  test("no match returns null", () => {
    const re = Regex("zzz");
    const m = re.match("abc");
    expect(m).toBeNull();
    re.dispose();
  });
});

describe("Regex.matchAll", () => {
  test("returns all matches", () => {
    const re = Regex("\\d+");
    const all = re.matchAll("a1 b2 c3");
    expect(all).toHaveLength(3);
    expect(all[0].value).toBe("1");
    expect(all[1].value).toBe("2");
    expect(all[2].value).toBe("3");
    re.dispose();
  });

  test("returns empty array when no matches", () => {
    const re = Regex("\\d+");
    const all = re.matchAll("no digits here");
    expect(all).toHaveLength(0);
    re.dispose();
  });

  test("matchAll with email pattern", () => {
    const re = Regex("(\\w+)@(\\w+\\.\\w+)");
    const all = re.matchAll("alice@a.com and bob@b.com");
    expect(all).toHaveLength(2);
    expect(all[0].value).toBe("alice@a.com");
    expect(all[1].value).toBe("bob@b.com");
    re.dispose();
  });
});
