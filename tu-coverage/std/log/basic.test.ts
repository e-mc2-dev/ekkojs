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
import { log } from "ekko:log";

describe("log basic", () => {
  test("log.info does not throw", () => {
    log.info("test info message");
    expect(true).toBe(true);
  });

  test("log.warn does not throw", () => {
    log.warn("test warning message");
    expect(true).toBe(true);
  });

  test("log.error does not throw", () => {
    log.error("test error message");
    expect(true).toBe(true);
  });

  test("log.debug does not throw", () => {
    log.debug("test debug message");
    expect(true).toBe(true);
  });

  test("log.info with object data", () => {
    log.info("message with data", { key: "value", count: 42 });
    expect(true).toBe(true);
  });

  test("log.warn with object data", () => {
    log.warn("warning with data", { code: 404 });
    expect(true).toBe(true);
  });

  test("log.error with object data", () => {
    log.error("error with details", { err: "something broke", stack: "trace" });
    expect(true).toBe(true);
  });

  test("log with nested object", () => {
    log.info("nested", { user: { name: "alice" }, tags: ["a", "b"] });
    expect(true).toBe(true);
  });
});
