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
import { readText, read, writeText, write, append, appendBytes, remove, mkdir, exists } from "ekko:fs";

const isWin = Ekko.platform === "win32";
const tmp = isWin ? "C:\\temp" : "/tmp";
const prefix = tmp + "/ekko_test_write_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

describe("writeText", () => {
  test("creates new file", async () => {
    await mkdir(prefix, { recursive: true });
    const path = prefix + "/new_file.txt";
    await writeText(path, "created");
    const content = await readText(path);
    expect(content).toBe("created");
  });

  test("overwrites existing file", async () => {
    const path = prefix + "/overwrite.txt";
    await writeText(path, "first");
    await writeText(path, "second");
    const content = await readText(path);
    expect(content).toBe("second");
  });

  test("empty string creates empty file", async () => {
    const path = prefix + "/empty.txt";
    await writeText(path, "");
    const content = await readText(path);
    expect(content).toBe("");
  });

  test("writes unicode content", async () => {
    const path = prefix + "/unicode.txt";
    const text = "こんにちは世界 🌍";
    await writeText(path, text);
    const content = await readText(path);
    expect(content).toBe(text);
  });

  test("writes long content", async () => {
    const path = prefix + "/long.txt";
    const text = "x".repeat(10000);
    await writeText(path, text);
    const content = await readText(path);
    expect(content).toHaveLength(10000);
  });
});

describe("write (binary)", () => {
  test("creates binary file from Uint8Array", async () => {
    const path = prefix + "/binary.bin";
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    await write(path, data);
    const result = await read(path);
    expect(result.length).toBe(5);
    expect(result[0]).toBe(1);
    expect(result[4]).toBe(5);
  });

  test("overwrites binary file", async () => {
    const path = prefix + "/binary_ow.bin";
    await write(path, new Uint8Array([10, 20]));
    await write(path, new Uint8Array([30, 40, 50]));
    const result = await read(path);
    expect(result.length).toBe(3);
    expect(result[0]).toBe(30);
  });
});

describe("append", () => {
  test("adds to existing file", async () => {
    const path = prefix + "/append.txt";
    await writeText(path, "hello");
    await append(path, " world");
    const content = await readText(path);
    expect(content).toBe("hello world");
  });

  test("multiple appends accumulate content", async () => {
    const path = prefix + "/multi_append.txt";
    await writeText(path, "a");
    await append(path, "b");
    await append(path, "c");
    await append(path, "d");
    const content = await readText(path);
    expect(content).toBe("abcd");
  });

  test("appendBytes adds bytes to existing file", async () => {
    const path = prefix + "/append_bytes.bin";
    await write(path, new Uint8Array([1, 2]));
    await appendBytes(path, new Uint8Array([3, 4]));
    const result = await read(path);
    expect(result.length).toBe(4);
    expect(result[2]).toBe(3);
    expect(result[3]).toBe(4);
  });
});

describe("write cleanup", () => {
  test("remove temp directory", async () => {
    await remove(prefix, { recursive: true });
    const stillExists = await exists(prefix);
    expect(stillExists).toBe(false);
  });
});
