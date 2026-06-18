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
import { add, greet, identity, VERSION } from "./fixtures/typed-module";
import { DEFAULT_PORT } from "./fixtures/interface-only";

describe("TypeScript .ts imports", () => {
  test("import .ts file works", () => {
    expect(add(2, 3)).toBe(5);
  });

  test("import .ts file with type annotations", () => {
    const result = greet({ name: "Bob", age: 25 });
    expect(typeof result).toBe("string");
  });

  test("imported function returns correct value", () => {
    expect(identity(99)).toBe(99);
  });

  test("multiple imports from same .ts file", () => {
    expect(add(1, 1)).toBe(2);
    expect(VERSION).toBe("1.0.0");
    expect(identity("x")).toBe("x");
  });

  test("import from subdirectory .ts file", () => {
    expect(DEFAULT_PORT).toBe(8080);
  });
});
