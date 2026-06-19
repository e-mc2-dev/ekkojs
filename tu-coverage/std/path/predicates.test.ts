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
import { isAbsolute, normalize, sep } from "ekko:fs/path";

const isWin = Ekko.platform === "win32";

describe("isAbsolute", () => {
  test("absolute path returns true", () => {
    const abs = isWin ? "C:\\some\\path" : "/some/path";
    expect(isAbsolute(abs)).toBe(true);
  });

  test("relative path returns false", () => {
    expect(isAbsolute("relative/path")).toBe(false);
  });

  test("dot path is relative", () => {
    expect(isAbsolute("./here")).toBe(false);
  });

  test("double-dot path is relative", () => {
    expect(isAbsolute("../parent")).toBe(false);
  });

  test("bare filename is relative", () => {
    expect(isAbsolute("file.txt")).toBe(false);
  });
});

describe("normalize", () => {
  test("removes double slashes", () => {
    const input = isWin ? "C:\\\\foo\\\\bar" : "//foo//bar";
    const result = normalize(input);
    const doubleSep = sep + sep;
    expect(result).not.toContain(doubleSep);
  });

  test("resolves single dot", () => {
    const input = isWin ? "a\\.\\b" : "a/./b";
    const result = normalize(input);
    expect(result).toBe("a" + sep + "b");
  });

  test("resolves double dot", () => {
    const input = isWin ? "a\\b\\..\\c" : "a/b/../c";
    const result = normalize(input);
    expect(result).toBe("a" + sep + "c");
  });

  test("normalize returns string", () => {
    const result = normalize("a/b/c");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("normalize of already clean path is unchanged", () => {
    const clean = "a" + sep + "b" + sep + "c";
    const result = normalize(clean);
    expect(result).toBe(clean);
  });
});
