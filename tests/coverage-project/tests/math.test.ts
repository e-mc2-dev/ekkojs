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
import { add, addAll } from "../src/math/add.ts";
import { multiply, power } from "../src/math/multiply.ts";

import { mean } from "../src/math/stats.ts";

describe("add", () => {
  test("basic", () => { expect(add(1, 2)).toBe(3); });
  test("negative", () => { expect(add(-1, -2)).toBe(-3); });
  test("addAll", () => { expect(addAll(1, 2, 3, 4)).toBe(10); });
});

describe("multiply", () => {
  test("basic", () => { expect(multiply(3, 4)).toBe(12); });
  test("power positive", () => { expect(power(2, 3)).toBe(8); });
  test("power zero", () => { expect(power(5, 0)).toBe(1); });
  
});

describe("stats", () => {
  test("mean", () => { expect(mean([2, 4, 6])).toBe(4); });
  test("mean empty", () => { expect(mean([])).toBe(0); });
  
});
