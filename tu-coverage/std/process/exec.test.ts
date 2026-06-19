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
import { exec } from "ekko:process";

const isWin = Ekko.platform === "win32";

describe("exec basic", () => {
  test("returns result with stdout", async () => {
    const r = isWin
      ? await exec("cmd", ["/c", "echo", "hello"])
      : await exec("echo", ["hello"]);
    expect(typeof r.stdout).toBe("string");
  });

  test("captures echo output", async () => {
    const r = isWin
      ? await exec("cmd", ["/c", "echo", "hello world"])
      : await exec("echo", ["hello world"]);
    expect(r.stdout.trim()).toContain("hello");
  });

  test("exit code 0 for success", async () => {
    const r = isWin
      ? await exec("cmd", ["/c", "echo", "ok"])
      : await exec("echo", ["ok"]);
    expect(r.exitCode).toBe(0);
  });

  test("exit code non-zero for failure", async () => {
    const r = isWin
      ? await exec("cmd", ["/c", "exit", "42"])
      : await exec("sh", ["-c", "exit 42"]);
    expect(r.exitCode).toBe(42);
  });

  test("stderr is string", async () => {
    const r = isWin
      ? await exec("cmd", ["/c", "echo", "ok"])
      : await exec("echo", ["ok"]);
    expect(typeof r.stderr).toBe("string");
  });

  test("stderr captures error output", async () => {
    const r = isWin
      ? await exec("cmd", ["/c", "echo error message 1>&2"])
      : await exec("sh", ["-c", "echo error message >&2"]);
    expect(r.stderr).toContain("error message");
  });

  test("exec returns result object with expected fields", async () => {
    const r = isWin
      ? await exec("cmd", ["/c", "echo", "test"])
      : await exec("echo", ["test"]);
    expect(typeof r.stdout).toBe("string");
    expect(typeof r.stderr).toBe("string");
    expect(typeof r.exitCode).toBe("number");
  });

  test("exec with empty args", async () => {
    const r = isWin
      ? await exec("cmd", ["/c", "echo."])
      : await exec("echo", []);
    expect(r.exitCode).toBe(0);
  });

  test("exec captures multiline output", async () => {
    const r = isWin
      ? await exec("cmd", ["/c", "echo line1& echo line2"])
      : await exec("sh", ["-c", "echo line1; echo line2"]);
    expect(r.stdout).toContain("line1");
    expect(r.stdout).toContain("line2");
  });

  test("exec with cwd option", async () => {
    const cwd = isWin ? "C:\\temp" : "/tmp";
    const r = isWin
      ? await exec("cmd", ["/c", "cd"], { cwd })
      : await exec("pwd", [], { cwd });
    const out = r.stdout.trim();
    if (isWin) {
      expect(out.toLowerCase()).toContain("temp");
    } else {
      expect(out).toContain("/tmp");
    }
  });

  test("exec with timeout", async () => {
    const r = isWin
      ? await exec("cmd", ["/c", "ping -n 10 127.0.0.1"], { timeout: 500 })
      : await exec("sleep", ["10"], { timeout: 500 });
    expect(r.exitCode).not.toBe(0);
  });

  test("exec true command returns 0", async () => {
    const r = isWin
      ? await exec("cmd", ["/c", "echo."])
      : await exec("true", []);
    expect(r.exitCode).toBe(0);
  });
});
