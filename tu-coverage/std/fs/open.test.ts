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
import { writeText, readText, read, write, exists, remove, mkdir, stat } from "ekko:fs";

const isWin = Ekko.platform === "win32";
const tmp = isWin ? "C:\\temp" : "/tmp";
const prefix = tmp + "/ekko_test_open_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

describe("file open for writing (writeText creates file)", () => {
  test("writeText creates a new file that did not exist", async () => {
    await mkdir(prefix, { recursive: true });
    const path = prefix + "/open_new.txt";
    const before = await exists(path);
    expect(before).toBe(false);
    await writeText(path, "created via write");
    const after = await exists(path);
    expect(after).toBe(true);
  });

  test("writeText overwrites existing file content", async () => {
    const path = prefix + "/open_overwrite.txt";
    await writeText(path, "first pass");
    await writeText(path, "second pass");
    const content = await readText(path);
    expect(content).toBe("second pass");
  });

  test("write creates binary file from Uint8Array", async () => {
    const path = prefix + "/open_binary.bin";
    const data = new Uint8Array([10, 20, 30, 40, 50]);
    await write(path, data);
    const result = await read(path);
    expect(result.length).toBe(5);
    expect(result[0]).toBe(10);
    expect(result[4]).toBe(50);
  });
});

describe("file open for reading (readText on existing file)", () => {
  test("readText reads back written content", async () => {
    const path = prefix + "/open_read.txt";
    await writeText(path, "readable content");
    const content = await readText(path);
    expect(content).toBe("readable content");
  });

  test("read returns Uint8Array for binary file", async () => {
    const path = prefix + "/open_read_bin.bin";
    const data = new Uint8Array([0xCA, 0xFE, 0xBA, 0xBE]);
    await write(path, data);
    const result = await read(path);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result[0]).toBe(0xCA);
    expect(result[3]).toBe(0xBE);
  });

  test("readText on non-existent file throws", async () => {
    let threw = false;
    try {
      await readText(prefix + "/does_not_exist.txt");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe("multiple write/read cycles", () => {
  test("write then read three times on same path", async () => {
    const path = prefix + "/open_cycle.txt";
    for (let i = 0; i < 3; i++) {
      const content = "cycle_" + i;
      await writeText(path, content);
      const readBack = await readText(path);
      expect(readBack).toBe(content);
    }
  });

  test("write multiple files then read all back", async () => {
    const paths: string[] = [];
    for (let i = 0; i < 5; i++) {
      const path = prefix + "/multi_" + i + ".txt";
      paths.push(path);
      await writeText(path, "file_" + i);
    }
    for (let i = 0; i < 5; i++) {
      const content = await readText(paths[i]);
      expect(content).toBe("file_" + i);
    }
  });

  test("stat after write returns correct size", async () => {
    const path = prefix + "/open_stat.txt";
    const text = "twelve chars";
    await writeText(path, text);
    const info = await stat(path);
    expect(info.isFile).toBe(true);
    expect(info.size).toBeGreaterThan(0);
  });

  test("exists returns false after remove", async () => {
    const path = prefix + "/open_remove.txt";
    await writeText(path, "temporary");
    await remove(path);
    const result = await exists(path);
    expect(result).toBe(false);
  });
});

describe("open cleanup", () => {
  test("remove temp directory", async () => {
    await remove(prefix, { recursive: true });
    const stillExists = await exists(prefix);
    expect(stillExists).toBe(false);
  });
});
