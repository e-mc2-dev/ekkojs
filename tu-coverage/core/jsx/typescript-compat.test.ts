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
import { getUser, getStatus, tuple, generic, optional, WithJSX } from "./fixtures/ts-features";

describe("TypeScript compatibility in .tsx files", () => {
  test("getUser() returns { name: 'Alice', age: 30 }", () => {
    const user = getUser();
    expect(user.name).toBe("Alice");
    expect(user.age).toBe(30);
  });

  test("getStatus() returns 'active'", () => {
    expect(getStatus()).toBe("active");
  });

  test("tuple is ['hello', 42]", () => {
    expect(tuple[0]).toBe("hello");
    expect(tuple[1]).toBe(42);
  });

  test("generic('test') returns 'test'", () => {
    expect(generic("test")).toBe("test");
  });

  test("generic(42) returns 42", () => {
    expect(generic(42)).toBe(42);
  });

  test("optional() with no argument returns 0", () => {
    expect(optional()).toBe(0);
  });

  test("optional(5) returns 5", () => {
    expect(optional(5)).toBe(5);
  });

  test("WithJSX is a function — JSX + TS in same file", () => {
    expect(typeof WithJSX).toBe("function");
  });

  test("WithJSX() returns an object — arrow function with JSX", () => {
    const result = WithJSX();
    expect(result).not.toBe(undefined);
    expect(typeof result).toBe("object");
  });

  test("TypeScript interfaces do not cause runtime errors in .tsx", () => {

    expect(typeof getUser).toBe("function");
  });
});
