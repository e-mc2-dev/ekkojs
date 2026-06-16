// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { assert, assertEqual, assertNotEqual, assertStrictEqual, assertDeepEqual, assertThrows, assertType, fail } from "ekko:test/assert";
const c: [string, boolean][] = [];

assert(true);
c.push(["assert truthy", true]);

let threw = false;
try { assert(false); } catch (e) { threw = e.name === "AssertionError"; }
c.push(["assert falsy throws", threw]);

threw = false;
try { assert(false, "custom msg"); } catch (e) { threw = e.message === "custom msg"; }
c.push(["assert custom message", threw]);

assertEqual(1, 1);
c.push(["assertEqual", true]);

assertStrictEqual(42, 42);
c.push(["assertStrictEqual", true]);

threw = false;
try { assertStrictEqual(1, "1"); } catch { threw = true; }
c.push(["assertStrictEqual fails on type mismatch", threw]);

assertNotEqual(1, 2);
c.push(["assertNotEqual", true]);

assertDeepEqual({a: 1, b: [2, 3]}, {a: 1, b: [2, 3]});
c.push(["assertDeepEqual", true]);

threw = false;
try { assertDeepEqual({a: 1}, {a: 2}); } catch { threw = true; }
c.push(["assertDeepEqual fails", threw]);

assertThrows(() => { throw new Error("boom"); });
c.push(["assertThrows", true]);

assertThrows(() => { throw new Error("boom"); }, "boom");
c.push(["assertThrows with message", true]);

threw = false;
try { assertThrows(() => {}); } catch { threw = true; }
c.push(["assertThrows fails when no throw", threw]);

assertType("hello", "string");
assertType(42, "number");
c.push(["assertType", true]);

threw = false;
try { fail("nope"); } catch (e) { threw = e.name === "AssertionError"; }
c.push(["fail throws", threw]);

let p = 0, f = 0;
for (const [n, ok] of c) {
  if (ok) { p++; console.log("  PASS:", n); }
  else { f++; console.log("  FAIL:", n); }
}
console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
