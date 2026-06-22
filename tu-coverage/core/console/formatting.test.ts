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

describe("console formatting", () => {
  test("console.log with multiple args does not throw", () => {
    let threw = false;
    try { console.log("a", "b", "c"); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.log with object does not throw", () => {
    let threw = false;
    try { console.log({ key: "value", num: 42 }); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.log with array does not throw", () => {
    let threw = false;
    try { console.log([1, 2, 3]); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.log with mixed types does not throw", () => {
    let threw = false;
    try { console.log("str", 42, true, null, [1]); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.log with nested objects does not throw", () => {
    let threw = false;
    try {
      console.log({ a: { b: { c: [1, 2, { d: "deep" }] } } });
    } catch (_) {
      threw = true;
    }
    expect(threw).toBeFalsy();
  });
});
