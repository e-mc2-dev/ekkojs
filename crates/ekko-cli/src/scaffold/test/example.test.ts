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

describe("example", () => {
  test("adds numbers", () => {
    expect(1 + 1).toBe(2);
  });

  test("works with arrays", () => {
    expect([1, 2, 3].map((n) => n * 2)).toEqual([2, 4, 6]);
  });
});
