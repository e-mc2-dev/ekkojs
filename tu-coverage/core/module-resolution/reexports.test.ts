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
import { add, subtract, PI, doubleValue, MAX_VALUE } from "./fixtures/reexporter";

describe("re-exports - named re-exports", () => {
  test("re-exported add function works", () => {
    expect(add(3, 7)).toBe(10);
  });

  test("re-exported subtract function works", () => {
    expect(subtract(10, 3)).toBe(7);
  });

  test("re-exported PI constant has correct value", () => {
    expect(PI).toBe(3.14159);
  });
});

describe("re-exports - aliased re-exports", () => {
  test("re-exported double as doubleValue works", () => {
    expect(doubleValue(5)).toBe(10);
  });

  test("re-exported MAX_VALUE constant has correct value", () => {
    expect(MAX_VALUE).toBe(1000);
  });
});

describe("re-exports - type and identity", () => {
  test("re-exported functions are functions", () => {
    expect(typeof add).toBe("function");
    expect(typeof subtract).toBe("function");
    expect(typeof doubleValue).toBe("function");
  });

  test("re-exported constants are correct types", () => {
    expect(typeof PI).toBe("number");
    expect(typeof MAX_VALUE).toBe("number");
  });

  test("re-exported functions compose correctly", () => {
    const result = add(doubleValue(3), subtract(10, PI));
    expect(result).toBeGreaterThan(12);
    expect(result).toBeLessThan(13);
  });
});
