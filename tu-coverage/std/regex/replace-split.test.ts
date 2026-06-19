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

describe("Regex.replace", () => {
  test("replaces first match", () => {
    const re = Regex("world");
    const result = re.replace("hello world", "universe");
    expect(result).toBe("hello universe");
    re.dispose();
  });

  test("replaces with capture group references", () => {
    const re = Regex("(\\w+)@(\\w+\\.\\w+)");
    const result = re.replace("alice@a.com", "$1 at $2");
    expect(result).toBe("alice at a.com");
    re.dispose();
  });

  test("replaces digits", () => {
    const re = Regex("\\d+");
    const result = re.replace("item 42 here", "XX");
    expect(result).toContain("XX");
    re.dispose();
  });

  test("no match leaves string unchanged", () => {
    const re = Regex("zzz");
    const result = re.replace("hello world", "abc");
    expect(result).toBe("hello world");
    re.dispose();
  });

  test("replaces empty match pattern", () => {
    const re = Regex("o+");
    const result = re.replace("foobar", "0");
    expect(result).toContain("0");
    re.dispose();
  });
});

describe("Regex.split", () => {
  test("splits by comma pattern", () => {
    const re = Regex(",");
    const parts = re.split("a,b,c");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("a");
    expect(parts[1]).toBe("b");
    expect(parts[2]).toBe("c");
    re.dispose();
  });

  test("splits by whitespace pattern", () => {
    const re = Regex("\\s+");
    const parts = re.split("hello   world");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe("hello");
    expect(parts[1]).toBe("world");
    re.dispose();
  });

  test("splits by complex delimiter", () => {
    const re = Regex("[,;\\s]+");
    const parts = re.split("a, b; c  d");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("a");
    expect(parts[3]).toBe("d");
    re.dispose();
  });

  test("split with no match returns single element", () => {
    const re = Regex("zzz");
    const parts = re.split("hello");
    expect(parts).toHaveLength(1);
    expect(parts[0]).toBe("hello");
    re.dispose();
  });

  test("split with pattern at start and end", () => {
    const re = Regex(",");
    const parts = re.split(",a,b,");
    expect(parts[0]).toBe("");
    re.dispose();
  });
});
