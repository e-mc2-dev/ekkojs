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
import { Stack } from "../src/collections/stack.ts";

describe("Stack", () => {
  test("push and pop", () => {
    const s = new Stack();
    s.push(1);
    s.push(2);
    expect(s.pop()).toBe(2);
    expect(s.pop()).toBe(1);
  });

  test("isEmpty", () => {
    const s = new Stack();
    expect(s.isEmpty()).toBe(true);
    s.push(42);
    expect(s.isEmpty()).toBe(false);
  });

  test("size", () => {
    const s = new Stack();
    s.push("a");
    s.push("b");
    expect(s.size()).toBe(2);
  });

  test("peek", () => {
    const s = new Stack();
    s.push(99);
    expect(s.peek()).toBe(99);
    expect(s.size()).toBe(1);
  });

  
});
