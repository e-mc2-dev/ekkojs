// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


import { assert, assertEqual, assertNotEqual, assertStrictEqual, assertDeepEqual, assertThrows, assertRejects, assertType, fail } from "ekko:test/assert";
import { asserter } from "../_harness.ts";

const t = asserter();
const passes = (fn: () => any) => { try { fn(); return true; } catch { return false; } };
const throwsA = (fn: () => any) => { try { fn(); return false; } catch (e: any) { return e && e.name === "AssertionError"; } };

t.group("covered — core asserts");
t.check("assert truthy passes", passes(() => assert(1 === 1)));
t.check("assert falsy throws", throwsA(() => assert(false, "no")));
t.check("assertEqual loose passes", passes(() => assertEqual(1, "1" as any)));
t.check("assertEqual mismatch throws", throwsA(() => assertEqual(1, 2)));
t.check("assertStrictEqual passes", passes(() => assertStrictEqual(3, 3)));
t.check("assertStrictEqual loose throws", throwsA(() => assertStrictEqual(1, "1" as any)));
t.check("assertNotEqual passes", passes(() => assertNotEqual(1, 2)));
t.check("assertNotEqual equal throws", throwsA(() => assertNotEqual(1, 1)));
t.check("assertDeepEqual passes", passes(() => assertDeepEqual({ a: [1, 2] }, { a: [1, 2] })));
t.check("assertDeepEqual mismatch throws", throwsA(() => assertDeepEqual({ a: 1 }, { a: 2 })));
t.check("assertType passes", passes(() => assertType("x", "string")));
t.check("assertType mismatch throws", throwsA(() => assertType(5, "string")));

t.group("covered — assertThrows / assertRejects / fail");
t.check("assertThrows passes when throws", passes(() => assertThrows(() => { throw new Error("boom"); })));
t.check("assertThrows fails when no throw", throwsA(() => assertThrows(() => {})));
t.check("assertThrows message-substring match", passes(() => assertThrows(() => { throw new Error("disk full"); }, "full")));
t.check("assertThrows wrong message throws", throwsA(() => assertThrows(() => { throw new Error("x"); }, "y")));
t.check("assertThrows type match", passes(() => assertThrows(() => { throw new TypeError("t"); }, TypeError)));
t.check("fail() throws", throwsA(() => fail("done")));
{
  let ok = false; try { await assertRejects(async () => { throw new Error("nope"); }); ok = true; } catch {}
  t.check("assertRejects passes when rejects", ok);
  let bad = false; try { await assertRejects(async () => 1); } catch (e: any) { bad = e.name === "AssertionError"; }
  t.check("assertRejects fails when resolves", bad);
}

t.group("recheck — edges");
t.check("assertDeepEqual array order matters", throwsA(() => assertDeepEqual([1, 2], [2, 1])));
t.check("assertDeepEqual nested", passes(() => assertDeepEqual({ a: { b: [1, { c: 2 }] } }, { a: { b: [1, { c: 2 }] } })));
t.check("assertEqual null vs undefined loose equal", passes(() => assertEqual(null as any, undefined as any)));
t.check("assertStrictEqual NaN !== NaN throws", throwsA(() => assertStrictEqual(NaN, NaN)));
t.check("assert default message", throwsA(() => assert(0)));
t.check("assertType object", passes(() => assertType({}, "object")));
t.check("assertType function", passes(() => assertType(() => {}, "function")));
{
  
  let err: any = null; try { assertEqual(1, 2); } catch (e) { err = e; }
  t.check("AssertionError has expected", err && err.expected === 2);
  t.check("AssertionError has actual", err && err.actual === 1);
}

t.done("ekko:test/assert covered+recheck");
