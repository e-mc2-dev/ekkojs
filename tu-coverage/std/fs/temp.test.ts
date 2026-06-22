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
import { tempFile, tempDir, tempSubdir, writeText, readText, exists, remove } from "ekko:fs";

describe("tempFile", () => {
  test("returns a path to a file that exists", async () => {
    const path = await tempFile();
    const fileExists = await exists(path);
    expect(fileExists).toBe(true);
    await remove(path);
  });

  test("multiple calls return different paths", async () => {
    const path1 = await tempFile();
    const path2 = await tempFile();
    expect(path1).not.toBe(path2);
    await remove(path1);
    await remove(path2);
  });

  test("can write to tempFile path", async () => {
    const path = await tempFile();
    await writeText(path, "temp content");
    const content = await readText(path);
    expect(content).toBe("temp content");
    await remove(path);
  });

  test("tempFile path is a string", async () => {
    const path = await tempFile();
    expect(typeof path).toBe("string");
    expect(path.length).toBeGreaterThan(0);
    await remove(path);
  });
});

describe("tempDir", () => {
  test("returns a path to an existing directory", async () => {
    const dir = await tempDir();
    const dirExists = await exists(dir);
    expect(dirExists).toBe(true);
  });

  test("tempDir path is a string", async () => {
    const dir = await tempDir();
    expect(typeof dir).toBe("string");
    expect(dir.length).toBeGreaterThan(0);
  });
});

describe("tempSubdir", () => {
  test("creates a unique subdirectory", async () => {
    const dir = await tempSubdir();
    const dirExists = await exists(dir);
    expect(dirExists).toBe(true);
    await remove(dir, { recursive: true });
  });

  test("multiple calls return different paths", async () => {
    const dir1 = await tempSubdir();
    const dir2 = await tempSubdir();
    expect(dir1).not.toBe(dir2);
    await remove(dir1, { recursive: true });
    await remove(dir2, { recursive: true });
  });
});
