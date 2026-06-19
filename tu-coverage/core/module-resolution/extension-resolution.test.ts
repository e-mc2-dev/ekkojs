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
import { add, PI } from "./fixtures/named-exports";
import { nestedGreet } from "./fixtures/subdir/nested";

describe("extension resolution - .ts extension", () => {
  test("import with .ts extension resolves simple module", () => {
    expect(typeof greet).toBe("function");
    expect(greet("Test")).toBe("Hello, Test!");
  });

  test("import with .ts extension resolves constants", () => {
    expect(VERSION).toBe("1.0.0");
  });

  test("import with .ts extension resolves default export", () => {
    expect(typeof multiply).toBe("function");
    expect(multiply(5, 6)).toBe(30);
  });

  test("import with .ts extension resolves named exports", () => {
    expect(typeof add).toBe("function");
    expect(add(10, 20)).toBe(30);
  });

  test("import with .ts extension resolves numeric constants", () => {
    expect(typeof PI).toBe("number");
    expect(PI).toBe(3.14159);
  });

  test("import with .ts extension resolves nested directory modules", () => {
    expect(typeof nestedGreet).toBe("function");
    expect(nestedGreet("Ext")).toBe("Greetings from nested: Ext");
  });

  test("all imported functions are callable", () => {
    expect(greet("A")).toBeTruthy();
    expect(multiply(1, 1)).toBe(1);
    expect(add(0, 0)).toBe(0);
    expect(nestedGreet("B")).toBeTruthy();
  });

  test("imported values maintain their types across module boundary", () => {
    expect(typeof greet("X")).toBe("string");
    expect(typeof multiply(2, 2)).toBe("number");
    expect(typeof VERSION).toBe("string");
    expect(typeof PI).toBe("number");
  });
});
