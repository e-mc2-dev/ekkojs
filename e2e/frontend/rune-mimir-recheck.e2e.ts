// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


import { atom, selector, Mimir } from "ekko:rune/mimir";
import { asserter } from "../_harness.ts";

const t = asserter();

t.group("selector subscription BEFORE first get now notifies (task 226)");
{
  const m = new Mimir(); const c = atom({ key: "c", default: 1 });
  const dbl = selector({ key: "dbl", get: (g: any) => g.get(c) * 2 });
  const got: any[] = [];
  m.subscribe(dbl, (v: any) => got.push(v));   
  m.set(c, 5);
  t.deep("selector subscriber fired on dep change", got, [10]);
}
{
  
  const m = new Mimir(); const c = atom({ key: "tc", default: 1 });
  const dbl = selector({ key: "td", get: (g: any) => g.get(c) * 2 });
  const quad = selector({ key: "tq", get: (g: any) => g.get(dbl) * 2 });
  const got: any[] = [];
  m.subscribe(quad, (v: any) => got.push(v));
  m.set(c, 3);
  t.deep("transitive selector subscriber fired", got, [12]);
}
{
  
  const m = new Mimir(); const c = atom({ key: "ac", default: 1 });
  const dbl = selector({ key: "ad", get: (g: any) => g.get(c) * 2 });
  m.get(dbl); const got: any[] = []; m.subscribe(dbl, (v: any) => got.push(v)); m.set(c, 4);
  t.deep("subscribe-after-get still fires", got, [8]);
}

t.group("updater + sequence");
{
  const m = new Mimir(); const c = atom({ key: "u", default: 10 });
  m.set(c, (p: number) => p * 2); m.set(c, (p: number) => p - 5);
  t.eq("updater sequence", m.get(c), 15);
}

t.group("initStore force/merge edges");
{
  const c = atom({ key: "obj", default: { a: 1 } });
  const m = new Mimir(); m.set(c, { a: 1, b: 2 });
  m.initStore({ obj: { __merge: true, __value: { b: 3, c: 4 } } });
  t.deep("merge deep-merges", m.get(c), { a: 1, b: 3, c: 4 });
  const m2 = new Mimir(); m2.set(c, { x: 1 });
  m2.initStore({ obj: { __force: true, __value: { y: 2 } } });
  t.deep("force overrides", m2.get(c), { y: 2 });
  const m3 = new Mimir(); m3.initStore({ obj: { __merge: true, __value: { z: 9 } } });
  t.deep("merge into absent → set", m3.get(c), { z: 9 });
}

t.group("clearSession + Object.is semantics + value types");
{
  const m = new Mimir(); const c = atom({ key: "cs", default: "d" });
  m.set(c, "x"); const got: any[] = []; m.subscribe(c, (v: any) => got.push(v));
  m.clearSession();
  t.eq("clearSession resets to default", m.get(c), "d");
  t.deep("clearSession notifies changed", got, ["d"]);
}
{
  const m = new Mimir();
  const n = atom({ key: "nan", default: NaN });
  const got: any[] = []; m.subscribe(n, (v: any) => got.push(v)); m.set(n, NaN);
  t.deep("NaN→NaN skipped (Object.is)", got, []);
  const arr = atom({ key: "arr", default: [1, 2] }); m.set(arr, [3, 4]);
  t.deep("array value", m.get(arr), [3, 4]);
  const obj = atom({ key: "o", default: {} }); m.set(obj, { k: "v" });
  t.deep("object value", m.get(obj), { k: "v" });
}

t.group("session mode + isolation");
{
  const m = new Mimir();
  t.throws("invalid session mode throws", () => m.session("bogus" as any), /mode/i);
  t.notThrows("valid session modes", () => { m.session("none"); m.session("ephemeral"); m.session("domain"); });
}
{
  
  const c = atom({ key: "shared", default: 0 });
  const a = new Mimir(), b = new Mimir(); a.set(c, 11);
  t.eq("store b unaffected by store a", b.get(c), 0);
  t.eq("store a holds its value", a.get(c), 11);
}

t.done("ekko:rune/mimir recheck");
