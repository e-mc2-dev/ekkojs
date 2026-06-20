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
import { readText, writeText, copy, rename, remove, mkdir, exists } from "ekko:fs";

const isWin = Ekko.platform === "win32";
const tmp = isWin ? "C:\\temp" : "/tmp";
const prefix = tmp + "/ekko_test_fileops_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

describe("copy", () => {
  test("creates duplicate file", async () => {
    await mkdir(prefix, { recursive: true });
    const src = prefix + "/copy_src.txt";
    const dst = prefix + "/copy_dst.txt";
    await writeText(src, "original content");
    await copy(src, dst);
    const dstExists = await exists(dst);
    expect(dstExists).toBe(true);
  });

  test("preserves content", async () => {
    const src = prefix + "/copy_content_src.txt";
    const dst = prefix + "/copy_content_dst.txt";
    await writeText(src, "preserved data 12345");
    await copy(src, dst);
    const content = await readText(dst);
    expect(content).toBe("preserved data 12345");
  });

  test("source still exists after copy", async () => {
    const src = prefix + "/copy_still_src.txt";
    const dst = prefix + "/copy_still_dst.txt";
    await writeText(src, "still here");
    await copy(src, dst);
    const srcExists = await exists(src);
    expect(srcExists).toBe(true);
  });
});

describe("rename", () => {
  test("moves file to new path", async () => {
    const src = prefix + "/rename_src.txt";
    const dst = prefix + "/rename_dst.txt";
    await writeText(src, "moved content");
    await rename(src, dst);
    const dstExists = await exists(dst);
    expect(dstExists).toBe(true);
  });

  test("old path no longer exists", async () => {
    const src = prefix + "/rename_gone_src.txt";
    const dst = prefix + "/rename_gone_dst.txt";
    await writeText(src, "will be moved");
    await rename(src, dst);
    const srcExists = await exists(src);
    expect(srcExists).toBe(false);
  });

  test("content preserved after rename", async () => {
    const src = prefix + "/rename_data_src.txt";
    const dst = prefix + "/rename_data_dst.txt";
    await writeText(src, "important data");
    await rename(src, dst);
    const content = await readText(dst);
    expect(content).toBe("important data");
  });
});

describe("remove", () => {
  test("deletes file", async () => {
    const path = prefix + "/to_delete.txt";
    await writeText(path, "delete me");
    await remove(path);
    const stillExists = await exists(path);
    expect(stillExists).toBe(false);
  });

  test("deletes directory", async () => {
    const dir = prefix + "/to_delete_dir";
    await mkdir(dir, { recursive: true });
    await remove(dir, { recursive: true });
    const stillExists = await exists(dir);
    expect(stillExists).toBe(false);
  });
});

describe("exists", () => {
  test("returns true for existing file", async () => {
    const path = prefix + "/exists_file.txt";
    await writeText(path, "here");
    const result = await exists(path);
    expect(result).toBe(true);
  });

  test("returns false for non-existent file", async () => {
    const result = await exists(prefix + "/no_such_thing.txt");
    expect(result).toBe(false);
  });

  test("returns true for directory", async () => {
    const result = await exists(prefix);
    expect(result).toBe(true);
  });
});

describe("file-ops cleanup", () => {
  test("remove temp directory", async () => {
    await remove(prefix, { recursive: true });
    const stillExists = await exists(prefix);
    expect(stillExists).toBe(false);
  });
});
