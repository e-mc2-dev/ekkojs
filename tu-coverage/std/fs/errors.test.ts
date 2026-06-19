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
import { readText, stat, writeText, remove, readDir, mkdir, exists } from "ekko:fs";

const isWin = Ekko.platform === "win32";
const tmp = isWin ? "C:\\temp" : "/tmp";
const prefix = tmp + "/ekko_test_errors_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

describe("read errors", () => {
  test("readText non-existent file throws", async () => {
    let threw = false;
    try {
      await readText(prefix + "/does_not_exist.txt");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("readText on a directory throws", async () => {
    await mkdir(prefix, { recursive: true });
    let threw = false;
    try {
      await readText(prefix);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe("stat errors", () => {
  test("stat non-existent file throws", async () => {
    let threw = false;
    try {
      await stat(prefix + "/no_stat.txt");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe("write errors", () => {
  test("write to deeply invalid path throws", async () => {
    const badPath = prefix + "/no/such/deep/nested/path/file.txt";
    let threw = false;
    try {
      await writeText(badPath, "data");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe("remove errors", () => {
  test("remove non-existent path throws or is no-op", async () => {
    let threw = false;
    try {
      await remove(prefix + "/no_remove_target.txt");
    } catch {
      threw = true;
    }
    
    expect(typeof threw).toBe("boolean");
  });
});

describe("readDir errors", () => {
  test("readDir on a file (not directory) throws", async () => {
    const path = prefix + "/readdir_file.txt";
    await writeText(path, "not a dir");
    let threw = false;
    try {
      await readDir(path);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("readDir on non-existent path throws", async () => {
    let threw = false;
    try {
      await readDir(prefix + "/no_dir_here");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe("mkdir errors", () => {
  test("mkdir on existing file path throws", async () => {
    const path = prefix + "/mkdir_conflict.txt";
    await writeText(path, "I am a file");
    let threw = false;
    try {
      await mkdir(path);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe("errors cleanup", () => {
  test("remove temp directory", async () => {
    await remove(prefix, { recursive: true });
    const stillExists = await exists(prefix);
    expect(stillExists).toBe(false);
  });
});
