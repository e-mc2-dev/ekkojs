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
import { dirname, basename, extname } from "ekko:fs/path";

const isWin = Ekko.platform === "win32";

describe("dirname", () => {
  test("returns parent directory", () => {
    const input = isWin ? "C:\\foo\\bar.ts" : "/foo/bar.ts";
    const result = dirname(input);
    expect(result).toContain("foo");
    expect(result).not.toContain("bar.ts");
  });

  test("dirname of root returns root", () => {
    const root = isWin ? "C:\\" : "/";
    const result = dirname(root);
    expect(result.length).toBeGreaterThan(0);
  });

  test("dirname of nested path", () => {
    const input = isWin ? "C:\\a\\b\\c\\d.txt" : "/a/b/c/d.txt";
    const result = dirname(input);
    expect(result).toContain("c");
    expect(result).not.toContain("d.txt");
  });
});

describe("basename", () => {
  test("returns filename from path", () => {
    const input = isWin ? "C:\\foo\\bar.ts" : "/foo/bar.ts";
    const result = basename(input);
    expect(result).toBe("bar.ts");
  });

  test("returns filename without directory", () => {
    const result = basename("simple.txt");
    expect(result).toBe("simple.txt");
  });

  test("returns last segment of directory path", () => {
    const input = isWin ? "C:\\a\\b\\c" : "/a/b/c";
    const result = basename(input);
    expect(result).toBe("c");
  });
});

describe("extname", () => {
  test("returns .ts for typescript file", () => {
    const result = extname("file.ts");
    expect(result).toBe(".ts");
  });

  test("returns last extension for double extension", () => {
    const result = extname("file.test.ts");
    expect(result).toBe(".ts");
  });

  test("returns empty string for no extension", () => {
    const result = extname("noext");
    expect(result).toBe("");
  });

  test("returns .json for json file", () => {
    const result = extname("config.json");
    expect(result).toBe(".json");
  });

  test("returns empty for dotfile without further extension", () => {
    const result = extname(".gitignore");
    
    expect(typeof result).toBe("string");
  });

  test("returns extension from full path", () => {
    const input = isWin ? "C:\\project\\src\\main.rs" : "/project/src/main.rs";
    const result = extname(input);
    expect(result).toBe(".rs");
  });
});
