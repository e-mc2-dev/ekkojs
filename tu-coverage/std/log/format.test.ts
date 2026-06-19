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

describe("log format", () => {
  test("log object has info method (structured logging API)", () => {
    expect(typeof log.info).toBe("function");
  });

  test("log object has warn method", () => {
    expect(typeof log.warn).toBe("function");
  });

  test("log object has error method", () => {
    expect(typeof log.error).toBe("function");
  });

  test("log object has setLevel method", () => {
    expect(typeof log.setLevel).toBe("function");
  });

  test("createLogger returns object with structured methods", () => {
    const logger = createLogger("format-test");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.child).toBe("function");
  });
});
