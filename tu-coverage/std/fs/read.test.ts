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
import { read, readText, readLines, writeText, write, remove, mkdir, exists } from "ekko:fs";

const isWin = Ekko.platform === "win32";
const tmp = isWin ? "C:\\temp" : "/tmp";
const prefix = tmp + "/ekko_test_read_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

describe("readText", () => {
  test("reads existing file content", async () => {
    const path = prefix + "/read_existing.txt";
    await mkdir(prefix, { recursive: true });
    await writeText(path, "hello world");
    const content = await readText(path);
    expect(content).toBe("hello world");
  });

  test("reads empty file as empty string", async () => {
    const path = prefix + "/read_empty.txt";
    await writeText(path, "");
    const content = await readText(path);
    expect(content).toBe("");
  });

  test("reads unicode content correctly", async () => {
    const path = prefix + "/read_unicode.txt";
    await writeText(path, "café éèê üöä");
    const content = await readText(path);
    expect(content).toContain("é");
  });

  test("reads multiline content", async () => {
    const path = prefix + "/read_multi.txt";
    await writeText(path, "line1\nline2\nline3");
    const content = await readText(path);
    expect(content).toBe("line1\nline2\nline3");
  });

  test("throws for non-existent file", async () => {
    let threw = false;
    try {
      await readText(prefix + "/no_such_file.txt");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe("read (binary)", () => {
  test("returns Uint8Array", async () => {
    const path = prefix + "/read_bin.txt";
    await writeText(path, "abc");
    const data = await read(path);
    expect(data).toBeInstanceOf(Uint8Array);
  });

  test("returns correct bytes for known content", async () => {
    const path = prefix + "/read_bytes.bin";
    const bytes = new Uint8Array([0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff]);
    await write(path, bytes);
    const result = await read(path);
    expect(result.length).toBe(7);
    expect(result[0]).toBe(0x00);
    expect(result[1]).toBe(0x48);
    expect(result[6]).toBe(0xff);
  });

  test("read of empty file returns empty Uint8Array", async () => {
    const path = prefix + "/read_empty.bin";
    await write(path, new Uint8Array([]));
    const result = await read(path);
    expect(result.length).toBe(0);
  });
});

describe("readLines", () => {
  test("returns array of strings", async () => {
    const path = prefix + "/lines.txt";
    await writeText(path, "aaa\nbbb\nccc");
    const lines = await readLines(path);
    expect(lines).toContain("aaa");
    expect(lines).toContain("bbb");
    expect(lines).toContain("ccc");
  });

  test("multiline file has correct count", async () => {
    const path = prefix + "/lines_count.txt";
    await writeText(path, "one\ntwo\nthree\nfour\nfive");
    const lines = await readLines(path);
    expect(lines).toHaveLength(5);
  });

  test("single line file returns array with one element", async () => {
    const path = prefix + "/single_line.txt";
    await writeText(path, "only one line");
    const lines = await readLines(path);
    expect(lines[0]).toBe("only one line");
  });

  test("empty file returns empty array or single empty string", async () => {
    const path = prefix + "/lines_empty.txt";
    await writeText(path, "");
    const lines = await readLines(path);
    const totalLength = lines.join("").length;
    expect(totalLength).toBe(0);
  });
});

describe("read cleanup", () => {
  test("remove temp directory", async () => {
    await remove(prefix, { recursive: true });
    const stillExists = await exists(prefix);
    expect(stillExists).toBe(false);
  });
});
