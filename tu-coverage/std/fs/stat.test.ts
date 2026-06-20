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
import { stat, writeText, write, remove, mkdir, exists } from "ekko:fs";

const isWin = Ekko.platform === "win32";
const tmp = isWin ? "C:\\temp" : "/tmp";
const prefix = tmp + "/ekko_test_stat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

describe("stat on files", () => {
  test("stat of file has isFile true", async () => {
    await mkdir(prefix, { recursive: true });
    const path = prefix + "/stat_file.txt";
    await writeText(path, "some content");
    const info = await stat(path);
    expect(info.isFile).toBe(true);
  });

  test("stat of file has isDirectory false", async () => {
    const path = prefix + "/stat_file2.txt";
    await writeText(path, "data");
    const info = await stat(path);
    expect(info.isDirectory).toBe(false);
  });

  test("stat.size > 0 for non-empty file", async () => {
    const path = prefix + "/stat_size.txt";
    await writeText(path, "hello world");
    const info = await stat(path);
    expect(info.size).toBeGreaterThan(0);
  });

  test("stat.size is 0 or small for empty file", async () => {
    const path = prefix + "/stat_empty.txt";
    await writeText(path, "");
    const info = await stat(path);
    
    expect(info.size >= 0).toBe(true);
    expect(info.size < 10).toBe(true);
  });

  test("stat.size reflects actual byte count", async () => {
    const path = prefix + "/stat_exact.bin";
    await write(path, new Uint8Array([1, 2, 3, 4, 5]));
    const info = await stat(path);
    expect(info.size).toBe(5);
  });
});

describe("stat on directories", () => {
  test("stat of directory has isDirectory true", async () => {
    const dir = prefix + "/stat_dir";
    await mkdir(dir, { recursive: true });
    const info = await stat(dir);
    expect(info.isDirectory).toBe(true);
  });

  test("stat of directory has isFile false", async () => {
    const dir = prefix + "/stat_dir2";
    await mkdir(dir, { recursive: true });
    const info = await stat(dir);
    expect(info.isFile).toBe(false);
  });
});

describe("stat errors", () => {
  test("stat of non-existent path throws", async () => {
    let threw = false;
    try {
      await stat(prefix + "/no_such_path");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("stat returns object with expected properties", async () => {
    const path = prefix + "/stat_props.txt";
    await writeText(path, "props");
    const info = await stat(path);
    expect(info).toHaveProperty("size");
    expect(info).toHaveProperty("isFile");
    expect(info).toHaveProperty("isDirectory");
  });
});

describe("stat cleanup", () => {
  test("remove temp directory", async () => {
    await remove(prefix, { recursive: true });
    const stillExists = await exists(prefix);
    expect(stillExists).toBe(false);
  });
});
