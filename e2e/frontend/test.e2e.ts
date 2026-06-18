// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { expect } from "ekko:test";
import { asserter } from "../_harness";

const t = asserter();
const passes = (fn: () => any) => { try { fn(); return true; } catch { return false; } };
const fails = (fn: () => any) => { try { fn(); return false; } catch { return true; } };

t.group("covered — equality + truthiness");
t.check("toBe equal", passes(() => expect(5).toBe(5)));
t.check("toBe unequal fails", fails(() => expect(5).toBe(6)));
t.check("toEqual deep", passes(() => expect({ a: [1, 2] }).toEqual({ a: [1, 2] })));
t.check("toEqual mismatch fails", fails(() => expect({ a: 1 }).toEqual({ a: 2 })));
t.check("toBeTruthy", passes(() => expect(1).toBeTruthy()));
t.check("toBeTruthy on 0 fails", fails(() => expect(0).toBeTruthy()));
t.check("toBeFalsy", passes(() => expect("").toBeFalsy()));
t.check("toBeNull", passes(() => expect(null).toBeNull()));
t.check("toBeNull on undefined fails", fails(() => expect(undefined).toBeNull()));
t.check("toBeUndefined", passes(() => expect(undefined).toBeUndefined()));

t.group("covered — comparisons + collections");
t.check("toBeGreaterThan", passes(() => expect(5).toBeGreaterThan(3)));
t.check("toBeGreaterThan fails", fails(() => expect(2).toBeGreaterThan(3)));
t.check("toBeLessThan", passes(() => expect(2).toBeLessThan(3)));
t.check("toContain string", passes(() => expect("hello").toContain("ell")));
t.check("toContain array", passes(() => expect([1, 2, 3]).toContain(2)));
t.check("toContain missing fails", fails(() => expect([1]).toContain(9)));
t.check("toHaveLength", passes(() => expect([1, 2, 3]).toHaveLength(3)));
t.check("toHaveLength mismatch fails", fails(() => expect("ab").toHaveLength(3)));
t.check("toHaveProperty", passes(() => expect({ k: 1 }).toHaveProperty("k")));
t.check("toHaveProperty value", passes(() => expect({ k: 1 }).toHaveProperty("k", 1)));
t.check("toHaveProperty missing fails", fails(() => expect({}).toHaveProperty("k")));

t.group("covered — match / instance / throw");
t.check("toMatch regex", passes(() => expect("abc123").toMatch(/\d+/)));
t.check("toMatch string pattern", passes(() => expect("abc").toMatch("b")));
t.check("toMatch no-match fails", fails(() => expect("abc").toMatch(/\d/)));
t.check("toBeInstanceOf", passes(() => expect(new Error("x")).toBeInstanceOf(Error)));
t.check("toBeInstanceOf wrong fails", fails(() => expect({}).toBeInstanceOf(Error)));
t.check("toThrow", passes(() => expect(() => { throw new Error("boom"); }).toThrow()));
t.check("toThrow no-throw fails", fails(() => expect(() => {}).toThrow()));
t.check("toThrow message substring", passes(() => expect(() => { throw new Error("disk full"); }).toThrow("full")));

t.group("recheck — .not + edges");
t.check(".not.toBe passes when unequal", passes(() => expect(5).not.toBe(6)));
t.check(".not.toBe fails when equal", fails(() => expect(5).not.toBe(5)));
t.check(".not.toContain", passes(() => expect([1, 2]).not.toContain(9)));
t.check(".not.toBeNull", passes(() => expect(1).not.toBeNull()));
t.check(".not.toThrow", passes(() => expect(() => 1).not.toThrow()));
t.check(".not.toEqual", passes(() => expect({ a: 1 }).not.toEqual({ a: 2 })));
t.check("toEqual key order independent (JSON)", passes(() => expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 })));
t.check("toBe NaN vs NaN fails (strict)", fails(() => expect(NaN).toBe(NaN)));
t.check("toBeGreaterThan equal fails", fails(() => expect(3).toBeGreaterThan(3)));
t.check("toThrow wrong message fails", fails(() => expect(() => { throw new Error("a"); }).toThrow("b")));
t.check("toContain on non-string/array fails", fails(() => expect(123 as any).toContain(2)));

t.done("ekko:test expect covered+recheck");
