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

describe("console.table", () => {
  test("console.table with array of numbers does not throw", () => {
    let threw = false;
    try { console.table([1, 2, 3]); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.table with array of objects does not throw", () => {
    let threw = false;
    try { console.table([{ a: 1 }, { a: 2 }]); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.table with object does not throw", () => {
    let threw = false;
    try { console.table({ key: "value" }); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.table with empty array does not throw", () => {
    let threw = false;
    try { console.table([]); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });

  test("console.table with null does not throw", () => {
    let threw = false;
    try { console.table(null); } catch (_) { threw = true; }
    expect(threw).toBeFalsy();
  });
});
