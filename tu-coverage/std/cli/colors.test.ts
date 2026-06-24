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
import { cli } from "ekko:app/cli";

describe("cli ANSI color utilities", () => {
  test("cli.bold returns string with ANSI codes", () => {
    const result = cli.bold("hello");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("hello");
  });

  test("cli.green returns string with ANSI codes", () => {
    const result = cli.green("ok");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("ok");
  });

  test("cli.red returns string with ANSI codes", () => {
    const result = cli.red("error");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("error");
  });

  test("cli.yellow returns string with ANSI codes", () => {
    const result = cli.yellow("warn");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("warn");
  });

  test("cli.bold('hello') contains 'hello'", () => {
    const result = cli.bold("hello");
    expect(result.includes("hello")).toBe(true);
  });

  test("cli.green('ok') contains 'ok'", () => {
    const result = cli.green("ok");
    expect(result.includes("ok")).toBe(true);
  });

  test("bold contains \\x1b[1m", () => {
    const result = cli.bold("test");
    expect(result.includes("\x1b[1m")).toBe(true);
  });

  test("green contains \\x1b[32m", () => {
    const result = cli.green("test");
    expect(result.includes("\x1b[32m")).toBe(true);
  });
});
