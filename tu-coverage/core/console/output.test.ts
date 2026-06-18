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

describe("console output", () => {
  test("console.log with string does not throw", () => {
    let threw = false;
    try { console.log("hello"); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.log with number does not throw", () => {
    let threw = false;
    try { console.log(42); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.log with boolean does not throw", () => {
    let threw = false;
    try { console.log(true); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.log with null does not throw", () => {
    let threw = false;
    try { console.log(null); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.log with undefined does not throw", () => {
    let threw = false;
    try { console.log(undefined); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.error does not throw", () => {
    let threw = false;
    try { console.error("err"); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.warn does not throw", () => {
    let threw = false;
    try { console.warn("warn"); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.debug does not throw", () => {
    let threw = false;
    try { console.debug("debug"); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });
});
