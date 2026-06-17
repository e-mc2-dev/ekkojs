// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { test, expect, describe } from "ekko:test";

function add(a: number, b: number): number {
  return a + b;
}

function classify(score: number): string {
  if (score >= 90) {
    return "A";
  } else if (score >= 80) {
    return "B";
  } else if (score >= 70) {
    return "C";
  } else {
    return "F";
  }
}

function unusedFunction(): string {
  return "never called";
}

describe("add", () => {
  test("2+3=5", () => { expect(add(2, 3)).toBe(5); });
  test("negatives", () => { expect(add(-1, 1)).toBe(0); });
});

describe("classify", () => {
  test("A grade", () => { expect(classify(95)).toBe("A"); });
  test("B grade", () => { expect(classify(85)).toBe("B"); });
  
  test("F grade", () => { expect(classify(50)).toBe("F"); });
});
