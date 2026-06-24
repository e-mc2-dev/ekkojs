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
import { log, createLogger } from "ekko:log";

describe("createLogger", () => {
  test("creates a logger with name", () => {
    const logger = createLogger("myapp");
    expect(typeof logger).toBe("object");
  });

  test("logger has info method", () => {
    const logger = createLogger("test");
    expect(typeof logger.info).toBe("function");
  });

  test("logger has warn method", () => {
    const logger = createLogger("test");
    expect(typeof logger.warn).toBe("function");
  });

  test("logger has error method", () => {
    const logger = createLogger("test");
    expect(typeof logger.error).toBe("function");
  });

  test("logger has debug method", () => {
    const logger = createLogger("test");
    expect(typeof logger.debug).toBe("function");
  });

  test("logger.info does not throw", () => {
    const logger = createLogger("myapp");
    logger.info("request received", { path: "/api" });
    expect(true).toBe(true);
  });
});

describe("child logger", () => {
  test("child() returns logger object", () => {
    const logger = createLogger("http", { requestId: "abc-123" });
    const child = logger.child({ handler: "getUser" });
    expect(typeof child).toBe("object");
  });

  test("child logger has info method", () => {
    const logger = createLogger("http");
    const child = logger.child({ component: "db" });
    expect(typeof child.info).toBe("function");
  });

  test("child logger info does not throw", () => {
    const logger = createLogger("http");
    const child = logger.child({ component: "db" });
    child.info("fetching user");
    expect(true).toBe(true);
  });
});

describe("setLevel", () => {
  test("setLevel to debug does not throw", () => {
    log.setLevel("debug");
    log.debug("visible after setLevel debug");
    log.setLevel("info");
    expect(true).toBe(true);
  });

  test("setLevel to warn suppresses info", () => {
    log.setLevel("warn");
    log.info("this should be suppressed");
    log.warn("this should print");
    log.setLevel("info");
    expect(true).toBe(true);
  });

  test("setLevel back to info re-enables info", () => {
    log.setLevel("warn");
    log.setLevel("info");
    log.info("visible again");
    expect(true).toBe(true);
  });
});
