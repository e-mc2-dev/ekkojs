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
import { sep } from "ekko:fs/path";

const isWin = Ekko.platform === "win32";

describe("platform separator", () => {
  test("sep is correct for platform", () => {
    if (isWin) {
      expect(sep).toBe("\\");
    } else {
      expect(sep).toBe("/");
    }
  });

  test("sep is a string", () => {
    expect(typeof sep).toBe("string");
  });

  test("sep has length 1", () => {
    expect(sep).toHaveLength(1);
  });

  test("sep is not empty", () => {
    expect(sep.length).toBeGreaterThan(0);
  });
});
