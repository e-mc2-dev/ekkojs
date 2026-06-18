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

describe("exec", () => {
  test("exec starts a process and returns result", async () => {
    const p = isWin
      ? await exec("cmd", ["/c", "echo", "spawned"])
      : await exec("echo", ["spawned"]);
    expect(typeof p).toBe("object");
  });

  test("can read stdout from exec process", async () => {
    const p = isWin
      ? await exec("cmd", ["/c", "echo", "output"])
      : await exec("echo", ["output"]);
    expect(p.stdout.trim()).toContain("output");
  });

  test("exec process exit code 0 for success", async () => {
    const p = isWin
      ? await exec("cmd", ["/c", "echo", "ok"])
      : await exec("echo", ["ok"]);
    expect(p.exitCode).toBe(0);
  });

  test("exec process captures non-zero exit", async () => {
    const p = isWin
      ? await exec("cmd", ["/c", "exit", "1"])
      : await exec("sh", ["-c", "exit 1"]);
    expect(p.exitCode).toBe(1);
  });

  test("exec with no args", async () => {
    const p = isWin
      ? await exec("cmd", ["/c", "echo."])
      : await exec("echo", []);
    expect(p.exitCode).toBe(0);
  });

  test("exec captures stderr", async () => {
    const p = isWin
      ? await exec("cmd", ["/c", "echo err 1>&2"])
      : await exec("sh", ["-c", "echo err >&2"]);
    expect(p.stderr).toContain("err");
  });

  test("exec multiline output", async () => {
    const p = isWin
      ? await exec("cmd", ["/c", "echo a& echo b"])
      : await exec("sh", ["-c", "echo a; echo b"]);
    expect(p.stdout).toContain("a");
    expect(p.stdout).toContain("b");
  });

  test("exec with cwd", async () => {
    const cwd = isWin ? "C:\\Windows\\Temp" : "/tmp";
    const p = isWin
      ? await exec("cmd", ["/c", "cd"], { cwd })
      : await exec("pwd", [], { cwd });
    const out = p.stdout.trim();
    if (isWin) {
      expect(out.toLowerCase()).toContain("temp");
    } else {
      expect(out).toContain("/tmp");
    }
  });
});
