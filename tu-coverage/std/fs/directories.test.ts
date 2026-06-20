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
import { mkdir, readDir, writeText, remove, exists, tempDir, tempSubdir } from "ekko:fs";

const isWin = Ekko.platform === "win32";
const tmp = isWin ? "C:\\temp" : "/tmp";
const prefix = tmp + "/ekko_test_dirs_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

describe("mkdir", () => {
  test("creates directory", async () => {
    const dir = prefix + "/new_dir";
    await mkdir(dir, { recursive: true });
    const dirExists = await exists(dir);
    expect(dirExists).toBe(true);
  });

  test("creates nested directory with recursive flag", async () => {
    const dir = prefix + "/a/b/c/d";
    await mkdir(dir, { recursive: true });
    const dirExists = await exists(dir);
    expect(dirExists).toBe(true);
  });

  test("mkdir on already existing directory does not throw", async () => {
    const dir = prefix + "/existing_dir";
    await mkdir(dir, { recursive: true });
    await mkdir(dir, { recursive: true });
    const dirExists = await exists(dir);
    expect(dirExists).toBe(true);
  });
});

describe("readDir", () => {
  test("lists files in directory", async () => {
    const dir = prefix + "/list_dir";
    await mkdir(dir, { recursive: true });
    await writeText(dir + "/file1.txt", "a");
    await writeText(dir + "/file2.txt", "b");
    const entries = await readDir(dir);
    expect(entries.length >= 2).toBe(true);
  });

  test("empty directory returns empty array", async () => {
    const dir = prefix + "/empty_dir";
    await mkdir(dir, { recursive: true });
    const entries = await readDir(dir);
    expect(entries).toHaveLength(0);
  });

  test("includes created files by name", async () => {
    const dir = prefix + "/named_dir";
    await mkdir(dir, { recursive: true });
    await writeText(dir + "/alpha.txt", "alpha");
    await writeText(dir + "/beta.txt", "beta");
    const entries = await readDir(dir);
    const names = entries.map((e: any) => typeof e === "string" ? e : e.name);
    expect(names).toContain("alpha.txt");
    expect(names).toContain("beta.txt");
  });

  test("does not include files from parent directory", async () => {
    const dir = prefix + "/isolated_dir";
    await mkdir(dir, { recursive: true });
    await writeText(dir + "/inside.txt", "in");
    await writeText(prefix + "/outside.txt", "out");
    const entries = await readDir(dir);
    const names = entries.map((e: any) => typeof e === "string" ? e : e.name);
    expect(names).not.toContain("outside.txt");
  });
});

describe("tempDir and tempSubdir", () => {
  test("tempDir returns a path that exists", async () => {
    const dir = await tempDir();
    const dirExists = await exists(dir);
    expect(dirExists).toBe(true);
  });

  test("tempSubdir creates a subdirectory in temp", async () => {
    const dir = await tempSubdir();
    const dirExists = await exists(dir);
    expect(dirExists).toBe(true);
    await remove(dir, { recursive: true });
  });
});

describe("directories cleanup", () => {
  test("remove temp directory", async () => {
    await remove(prefix, { recursive: true });
    const stillExists = await exists(prefix);
    expect(stillExists).toBe(false);
  });
});
