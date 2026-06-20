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

describe("Ekko global object", () => {
  test("Ekko.version is a string", () => {
    expect(typeof Ekko.version).toBe("string");
  });

  test("Ekko.platform is win32, darwin, or linux", () => {
    const valid = ["win32", "darwin", "linux"];
    expect(valid).toContain(Ekko.platform);
  });

  test("Ekko.arch is x64 or arm64", () => {
    const valid = ["x64", "arm64"];
    expect(valid).toContain(Ekko.arch);
  });

  test("Ekko.pid is a positive number", () => {
    expect(typeof Ekko.pid).toBe("number");
    expect(Ekko.pid).toBeGreaterThan(0);
  });

  test("Ekko.args is an array", () => {
    expect(Array.isArray(Ekko.args)).toBeTruthy();
  });

  test("Ekko.cwd() returns a string", () => {
    expect(typeof Ekko.cwd()).toBe("string");
  });

  test("Ekko.cwd() is non-empty", () => {
    expect(Ekko.cwd().length).toBeGreaterThan(0);
  });

  test("Ekko.env is an object", () => {
    expect(typeof Ekko.env).toBe("object");
    expect(Ekko.env).not.toBeNull();
  });
});
