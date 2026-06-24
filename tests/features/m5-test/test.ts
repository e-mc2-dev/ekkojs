// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { describe, test, expect, beforeEach, afterEach } from "ekko:test";

const c: [string, boolean][] = [];

expect(1 + 1).toBe(2);
c.push(["toBe", true]);

expect([1, 2, 3]).toEqual([1, 2, 3]);
c.push(["toEqual", true]);

expect(true).toBeTruthy();
expect(false).toBeFalsy();
c.push(["toBeTruthy/toBeFalsy", true]);

expect(null).toBeNull();
expect(undefined).toBeUndefined();
c.push(["toBeNull/toBeUndefined", true]);

expect(10).toBeGreaterThan(5);
expect(3).toBeLessThan(7);
c.push(["toBeGreaterThan/toBeLessThan", true]);

expect([1, 2, 3]).toContain(2);
expect("hello world").toContain("world");
c.push(["toContain", true]);

expect([1, 2, 3]).toHaveLength(3);
c.push(["toHaveLength", true]);

expect({a: 1, b: 2}).toHaveProperty("a", 1);
c.push(["toHaveProperty", true]);

expect("hello123").toMatch(/\d+/);
c.push(["toMatch", true]);

expect(() => { throw new Error("boom"); }).toThrow("boom");
c.push(["toThrow", true]);

expect(1).not.toBe(2);
expect([1]).not.toEqual([2]);
expect(false).not.toBeTruthy();
c.push(["not negation", true]);

let hookValue = 0;
describe("hooks test", () => {
    beforeEach(() => { hookValue = 42; });
    afterEach(() => { hookValue = 0; });
    test("hook runs", () => {

        
        
    });
});
c.push(["describe/test/hooks register", true]);

test.skip("skipped test", () => { throw new Error("should not run"); });
c.push(["test.skip", true]);

let p = 0, f = 0;
for (const [n, ok] of c) {
  if (ok) { p++; console.log("  PASS:", n); }
  else { f++; console.log("  FAIL:", n); }
}
console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
