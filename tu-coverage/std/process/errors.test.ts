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

describe("exec error handling", () => {
  test("exec non-existent command throws or returns error", async () => {
    let failed = false;
    try {
      const r = await exec("nonexistent_command_xyz_999", []);
      if (r.exitCode !== 0) failed = true;
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test("exec with invalid program name throws or returns error", async () => {
    let failed = false;
    try {
      const r = await exec("/no/such/binary", []);
      if (r.exitCode !== 0) failed = true;
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test("exec returns non-zero for false command", async () => {
    const isWin = Ekko.platform === "win32";
    if (isWin) {
      const r = await exec("cmd", ["/c", "exit", "1"]);
      expect(r.exitCode).not.toBe(0);
    } else {
      const r = await exec("false", []);
      expect(r.exitCode).not.toBe(0);
    }
  });

  test("error result has stderr content", async () => {
    const isWin = Ekko.platform === "win32";
    const r = isWin
      ? await exec("cmd", ["/c", "echo fail 1>&2 & exit 1"])
      : await exec("sh", ["-c", "echo fail >&2; exit 1"]);
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).toContain("fail");
  });

  test("exec with empty command string throws or fails", async () => {
    let failed = false;
    try {
      const r = await exec("", []);
      if (r.exitCode !== 0) failed = true;
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test("timeout produces non-zero exit", async () => {
    const isWin = Ekko.platform === "win32";
    const r = isWin
      ? await exec("cmd", ["/c", "ping -n 30 127.0.0.1"], { timeout: 200 })
      : await exec("sleep", ["30"], { timeout: 200 });
    expect(r.exitCode).not.toBe(0);
  });
});
