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
const prefix = tmp + "/ekko_test_perms_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

describe("stat returns correct metadata for files", () => {
  test("stat returns object with isFile true for a file", async () => {
    await mkdir(prefix, { recursive: true });
    const path = prefix + "/perm_file.txt";
    await writeText(path, "some content");
    const info = await stat(path);
    expect(info.isFile).toBe(true);
  });

  test("stat returns object with isDirectory false for a file", async () => {
    const path = prefix + "/perm_file2.txt";
    await writeText(path, "data");
    const info = await stat(path);
    expect(info.isDirectory).toBe(false);
  });

  test("stat returns object with size property", async () => {
    const path = prefix + "/perm_size.txt";
    await writeText(path, "hello");
    const info = await stat(path);
    expect(info).toHaveProperty("size");
    expect(info.size).toBeGreaterThan(0);
  });

  test("stat of newly written file has correct size", async () => {
    const path = prefix + "/perm_exact_size.bin";
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    await write(path, data);
    const info = await stat(path);
    expect(info.size).toBe(10);
  });
});

describe("stat returns correct metadata for directories", () => {
  test("stat returns isDirectory true for a directory", async () => {
    const dir = prefix + "/perm_dir";
    await mkdir(dir, { recursive: true });
    const info = await stat(dir);
    expect(info.isDirectory).toBe(true);
  });
});

describe("exists reflects file lifecycle", () => {
  test("exists after write returns true", async () => {
    const path = prefix + "/perm_exists.txt";
    await writeText(path, "present");
    const result = await exists(path);
    expect(result).toBe(true);
  });

  test("exists after remove returns false", async () => {
    const path = prefix + "/perm_gone.txt";
    await writeText(path, "temporary");
    await remove(path);
    const result = await exists(path);
    expect(result).toBe(false);
  });
});

describe("permissions cleanup", () => {
  test("remove temp directory", async () => {
    await remove(prefix, { recursive: true });
    const stillExists = await exists(prefix);
    expect(stillExists).toBe(false);
  });
});
