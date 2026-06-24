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
import { readText, read, writeText, write, append, readLines, stat, remove, mkdir, exists } from "ekko:fs";

const isWin = Ekko.platform === "win32";
const tmp = isWin ? "C:\\temp" : "/tmp";
const prefix = tmp + "/ekko_test_large_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

describe("large text files", () => {
  test("write and read 100KB text file", async () => {
    await mkdir(prefix, { recursive: true });
    const path = prefix + "/large_100k.txt";
    const content = "x".repeat(100 * 1024);
    await writeText(path, content);
    const readBack = await readText(path);
    expect(readBack).toBe(content);
  });

  test("write 1MB binary file and read back matches length", async () => {
    const path = prefix + "/large_1mb.bin";
    const size = 1024 * 1024;
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) data[i] = i % 256;
    await write(path, data);
    const result = await read(path);
    expect(result.length).toBe(size);
    expect(result[0]).toBe(0);
    expect(result[255]).toBe(255);
    expect(result[256]).toBe(0);
  });

  test("append 100 times to a file, verify total content", async () => {
    const path = prefix + "/large_append.txt";
    await writeText(path, "");
    const chunk = "abcdefghij"; 
    for (let i = 0; i < 100; i++) {
      await append(path, chunk);
    }
    const content = await readText(path);
    expect(content.length).toBe(1000);
    expect(content).toContain("abcdefghij");
  });

  test("readLines on file with 1000 lines", async () => {
    const path = prefix + "/large_lines.txt";
    const lines: string[] = [];
    for (let i = 0; i < 1000; i++) {
      lines.push("line_" + i);
    }
    await writeText(path, lines.join("\n"));
    const result = await readLines(path);
    expect(result).toHaveLength(1000);
    expect(result[0]).toBe("line_0");
    expect(result[999]).toBe("line_999");
  });

  test("stat.size matches written content length for text", async () => {
    const path = prefix + "/large_stat.txt";
    const content = "a".repeat(5000);
    await writeText(path, content);
    const info = await stat(path);
    
    expect(info.size >= 5000 && info.size <= 5003).toBe(true);
  });

  test("stat.size matches written content length for binary", async () => {
    const path = prefix + "/large_stat.bin";
    const data = new Uint8Array(8192);
    for (let i = 0; i < 8192; i++) data[i] = i % 256;
    await write(path, data);
    const info = await stat(path);
    expect(info.size).toBe(8192);
  });

  test("binary roundtrip with large Uint8Array preserves all bytes", async () => {
    const path = prefix + "/large_binary_rt.bin";
    const size = 50000;
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) data[i] = i % 256;
    await write(path, data);
    const result = await read(path);
    expect(result.length).toBe(size);
    
    expect(result[0]).toBe(0);
    expect(result[127]).toBe(127);
    expect(result[255]).toBe(255);
    expect(result[49999]).toBe(49999 % 256);
  });

  test("write large text and verify stat reports isFile true", async () => {
    const path = prefix + "/large_isfile.txt";
    await writeText(path, "data".repeat(10000));
    const info = await stat(path);
    expect(info.isFile).toBe(true);
    expect(info.isDirectory).toBe(false);
  });
});

describe("large-files cleanup", () => {
  test("remove temp directory", async () => {
    await remove(prefix, { recursive: true });
    const stillExists = await exists(prefix);
    expect(stillExists).toBe(false);
  });
});
