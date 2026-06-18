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
import { resolve, isAbsolute, sep } from "ekko:fs/path";

const isWin = Ekko.platform === "win32";

describe("resolve", () => {
  test("resolve with absolute path returns that path", () => {
    const abs = isWin ? "C:\\some\\path" : "/some/path";
    const result = resolve(abs);
    expect(result).toContain("some");
    expect(result).toContain("path");
  });

  test("resolve with relative path returns absolute", () => {
    const result = resolve("relative", "file.ts");
    expect(isAbsolute(result)).toBe(true);
  });

  test("resolve result is always absolute", () => {
    const result = resolve("a", "b", "c");
    expect(isAbsolute(result)).toBe(true);
  });

  test("resolve with dot and filename contains filename", () => {
    const result = resolve(".", "file.ts");
    expect(result).toContain("file.ts");
  });

  test("resolve returns string", () => {
    const result = resolve("test");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("resolve with no arguments returns cwd-like path", () => {
    const result = resolve();
    expect(isAbsolute(result)).toBe(true);
  });

  test("resolve normalizes path separators", () => {
    const result = resolve("a", "b");
    const doubleSep = sep + sep;
    
    const check = isWin ? result.replace(/^\\\\\?\\/, "") : result;
    expect(check).not.toContain(doubleSep);
  });

  test("resolve with parent double-dot resolves upward", () => {
    const abs = isWin ? "C:\\a\\b\\c" : "/a/b/c";
    const result = resolve(abs, "..");
    expect(result).not.toMatch(/c$/);
  });
});
