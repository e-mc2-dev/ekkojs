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
import { greet, getStatus, identity, makePair, add, optionalParam, VERSION } from "./fixtures/typed-module";
import type { User, Status, Pair } from "./fixtures/typed-module";
import { DEFAULT_PORT } from "./fixtures/interface-only";

describe("TypeScript type stripping", () => {
  test("imported function with type annotations works", () => {
    const user: User = { name: "Alice", age: 30 };
    const result = greet(user);
    expect(result).toBe("Hello, Alice!");
  });

  test("type annotations do not cause runtime errors", () => {
    const x: number = 42;
    const s: string = "hello";
    const b: boolean = true;
    expect(x).toBe(42);
    expect(s).toBe("hello");
    expect(b).toBe(true);
  });

  test("generic function works at runtime", () => {
    expect(identity(42)).toBe(42);
    expect(identity("hello")).toBe("hello");
    expect(identity(true)).toBe(true);
  });

  test("interface-only module imports successfully", () => {
    expect(DEFAULT_PORT).toBe(8080);
  });

  test("type assertions compile and run", () => {
    const value = "test" as string;
    expect(value).toBe("test");
  });

  test("const assertions work", () => {
    const obj = { x: 10, y: 20 } as const;
    expect(obj.x).toBe(10);
    expect(obj.y).toBe(20);
  });

  test("optional parameters work", () => {
    expect(optionalParam(5)).toBe(5);
    expect(optionalParam(5, 3)).toBe(8);
  });

  test("union type return works at runtime", () => {
    const status: Status = getStatus();
    expect(status).toBe("active");
  });

  test("generic pair function works", () => {
    const pair: Pair<number, string> = makePair(1, "one");
    expect(pair.first).toBe(1);
    expect(pair.second).toBe("one");
  });

  test("exported constant with type annotation", () => {
    expect(VERSION).toBe("1.0.0");
    expect(typeof VERSION).toBe("string");
  });
});
