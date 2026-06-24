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
import { greet, VERSION } from "./fixtures/simple";
import multiply from "./fixtures/default-export";
import { add, subtract, double, PI, MAX_VALUE } from "./fixtures/named-exports";
import { nestedGreet, NESTED_ID } from "./fixtures/subdir/nested";

describe("relative imports - same directory fixtures", () => {
  test("import named function from simple module", () => {
    const result = greet("World");
    expect(result).toBe("Hello, World!");
  });

  test("import constant from simple module", () => {
    expect(VERSION).toBe("1.0.0");
  });

  test("import default export function", () => {
    const result = multiply(3, 4);
    expect(result).toBe(12);
  });

  test("import multiple named exports", () => {
    expect(add(2, 3)).toBe(5);
    expect(subtract(10, 4)).toBe(6);
    expect(double(7)).toBe(14);
  });

  test("import constant PI from named-exports", () => {
    expect(PI).toBeGreaterThan(3.14);
    expect(PI).toBeLessThan(3.15);
  });

  test("import constant MAX_VALUE from named-exports", () => {
    expect(MAX_VALUE).toBe(1000);
  });
});

describe("relative imports - subdirectory", () => {
  test("import function from nested subdirectory", () => {
    const result = nestedGreet("Alice");
    expect(result).toBe("Greetings from nested: Alice");
  });

  test("import constant from nested subdirectory", () => {
    expect(NESTED_ID).toBe(42);
  });
});

describe("relative imports - value correctness", () => {
  test("greet returns correct format for various inputs", () => {
    expect(greet("")).toBe("Hello, !");
    expect(greet("Bob")).toBe("Hello, Bob!");
    expect(greet("123")).toBe("Hello, 123!");
  });

  test("multiply handles edge cases", () => {
    expect(multiply(0, 100)).toBe(0);
    expect(multiply(-2, 3)).toBe(-6);
    expect(multiply(1, 1)).toBe(1);
  });

  test("arithmetic functions compose correctly", () => {
    const result = add(double(3), subtract(10, 5));
    expect(result).toBe(11);
  });

  test("imported values are the correct types", () => {
    expect(typeof greet).toBe("function");
    expect(typeof VERSION).toBe("string");
    expect(typeof multiply).toBe("function");
    expect(typeof PI).toBe("number");
  });
});
