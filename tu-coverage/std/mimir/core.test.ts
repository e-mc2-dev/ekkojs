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
import { atom, selector, mimir, createStore, Mimir } from "ekko:rune/mimir";

describe("atom", () => {
  test("creates a frozen atom definition", () => {
    const countAtom = atom({ key: "count", default: 0 });
    expect(countAtom.key).toBe("count");
    expect(countAtom.default).toBe(0);
    expect(countAtom.__brand).toBe("atom");
    expect(countAtom.persist).toBe(true);
    expect(Object.isFrozen(countAtom)).toBe(true);
  });

  test("persist defaults to true", () => {
    const a = atom({ key: "a", default: "" });
    expect(a.persist).toBe(true);
  });

  test("persist can be set to false", () => {
    const a = atom({ key: "a-nopersist", default: "", persist: false });
    expect(a.persist).toBe(false);
  });

  test("throws without key", () => {
    expect(() => atom({ default: 0 } as any)).toThrow();
  });

  test("throws with empty key", () => {
    expect(() => atom({ key: "", default: 0 })).toThrow();
  });

  test("throws without default", () => {
    expect(() => atom({ key: "x" } as any)).toThrow();
  });

  test("supports object defaults", () => {
    const a = atom({ key: "obj", default: { x: 1, y: 2 } });
    expect(a.default.x).toBe(1);
    expect(a.default.y).toBe(2);
  });

  test("supports array defaults", () => {
    const a = atom({ key: "arr", default: [1, 2, 3] });
    expect(a.default.length).toBe(3);
  });

  test("supports null default", () => {
    const a = atom({ key: "nullable", default: null });
    expect(a.default).toBe(null);
  });
});

describe("selector", () => {
  test("creates a frozen selector definition", () => {
    const sel = selector({
      key: "doubled",
      get: ({ get }: any) => get(atom({ key: "n", default: 1 })) * 2,
    });
    expect(sel.key).toBe("doubled");
    expect(sel.__brand).toBe("selector");
    expect(typeof sel.get).toBe("function");
    expect(Object.isFrozen(sel)).toBe(true);
  });

  test("throws without key", () => {
    expect(() => selector({ get: () => 0 } as any)).toThrow();
  });

  test("throws without get function", () => {
    expect(() => selector({ key: "x" } as any)).toThrow();
  });

  test("throws with non-function get", () => {
    expect(() => selector({ key: "y", get: 42 } as any)).toThrow();
  });
});

describe("Mimir.get / Mimir.set", () => {
  test("get returns default value initially", () => {
    const store = new Mimir();
    const a = atom({ key: "v1", default: 42 });
    expect(store.get(a)).toBe(42);
  });

  test("set updates value", () => {
    const store = new Mimir();
    const a = atom({ key: "v2", default: 0 });
    store.set(a, 10);
    expect(store.get(a)).toBe(10);
  });

  test("set with updater function", () => {
    const store = new Mimir();
    const a = atom({ key: "v3", default: 5 });
    store.set(a, (prev: number) => prev + 1);
    expect(store.get(a)).toBe(6);
    store.set(a, (prev: number) => prev * 3);
    expect(store.get(a)).toBe(18);
  });

  test("set does not notify when value is unchanged (Object.is)", () => {
    const store = new Mimir();
    const a = atom({ key: "v4", default: 7 });
    let callCount = 0;
    store.subscribe(a, () => { callCount++; });
    store.set(a, 7);
    expect(callCount).toBe(0);
  });

  test("set throws for selector", () => {
    const store = new Mimir();
    const sel = selector({ key: "s", get: () => 0 });
    expect(() => store.set(sel as any, 1)).toThrow();
  });

  test("set supports string values", () => {
    const store = new Mimir();
    const a = atom({ key: "str", default: "hello" });
    store.set(a, "world");
    expect(store.get(a)).toBe("world");
  });

  test("set supports object values", () => {
    const store = new Mimir();
    const a = atom({ key: "obj2", default: { x: 0 } });
    store.set(a, { x: 42 });
    expect(store.get(a).x).toBe(42);
  });

  test("set supports null", () => {
    const store = new Mimir();
    const a = atom({ key: "n2", default: "non-null" as any });
    store.set(a, null);
    expect(store.get(a)).toBe(null);
  });

  test("set supports boolean", () => {
    const store = new Mimir();
    const a = atom({ key: "bool", default: false });
    store.set(a, true);
    expect(store.get(a)).toBe(true);
  });
});

describe("Mimir.subscribe", () => {
  test("calls listener on value change", () => {
    const store = new Mimir();
    const a = atom({ key: "sub1", default: 0 });
    const values: number[] = [];
    store.subscribe(a, (v: number) => values.push(v));
    store.set(a, 1);
    store.set(a, 2);
    store.set(a, 3);
    expect(values.length).toBe(3);
    expect(values[0]).toBe(1);
    expect(values[1]).toBe(2);
    expect(values[2]).toBe(3);
  });

  test("unsubscribe stops notifications", () => {
    const store = new Mimir();
    const a = atom({ key: "sub2", default: 0 });
    let callCount = 0;
    const unsub = store.subscribe(a, () => { callCount++; });
    store.set(a, 1);
    expect(callCount).toBe(1);
    unsub();
    store.set(a, 2);
    expect(callCount).toBe(1);
  });

  test("multiple subscribers all notified", () => {
    const store = new Mimir();
    const a = atom({ key: "sub3", default: 0 });
    let c1 = 0, c2 = 0;
    store.subscribe(a, () => { c1++; });
    store.subscribe(a, () => { c2++; });
    store.set(a, 1);
    expect(c1).toBe(1);
    expect(c2).toBe(1);
  });

  test("throws if callback is not a function", () => {
    const store = new Mimir();
    const a = atom({ key: "sub4", default: 0 });
    expect(() => store.subscribe(a, 42 as any)).toThrow();
  });

  test("listener receives new value", () => {
    const store = new Mimir();
    const a = atom({ key: "sub5", default: "old" });
    let received = "";
    store.subscribe(a, (v: string) => { received = v; });
    store.set(a, "new");
    expect(received).toBe("new");
  });
});

describe("Mimir.reset", () => {
  test("restores default value", () => {
    const store = new Mimir();
    const a = atom({ key: "rst1", default: 100 });
    store.set(a, 999);
    expect(store.get(a)).toBe(999);
    store.reset(a);
    expect(store.get(a)).toBe(100);
  });

  test("notifies subscribers on reset", () => {
    const store = new Mimir();
    const a = atom({ key: "rst2", default: 0 });
    store.set(a, 10);
    let notified = false;
    store.subscribe(a, () => { notified = true; });
    store.reset(a);
    expect(notified).toBe(true);
  });

  test("does not notify if already at default", () => {
    const store = new Mimir();
    const a = atom({ key: "rst3", default: 0 });
    let callCount = 0;
    store.subscribe(a, () => { callCount++; });
    store.reset(a);
    expect(callCount).toBe(0);
  });

  test("throws for selector", () => {
    const store = new Mimir();
    const sel = selector({ key: "rsel", get: () => 0 });
    expect(() => store.reset(sel as any)).toThrow();
  });
});

describe("selector derivation", () => {
  test("derives value from atoms", () => {
    const store = new Mimir();
    const countAtom = atom({ key: "sc1", default: 3 });
    const doubled = selector({
      key: "sc1-doubled",
      get: ({ get }: any) => get(countAtom) * 2,
    });
    expect(store.get(doubled)).toBe(6);
  });

  test("recomputes when dependency changes", () => {
    const store = new Mimir();
    const baseAtom = atom({ key: "sc2", default: 5 });
    const tripled = selector({
      key: "sc2-tripled",
      get: ({ get }: any) => get(baseAtom) * 3,
    });
    expect(store.get(tripled)).toBe(15);
    store.set(baseAtom, 10);
    expect(store.get(tripled)).toBe(30);
  });

  test("selector depending on multiple atoms", () => {
    const store = new Mimir();
    const a = atom({ key: "ma", default: 2 });
    const b = atom({ key: "mb", default: 3 });
    const sum = selector({
      key: "ma-mb-sum",
      get: ({ get }: any) => get(a) + get(b),
    });
    expect(store.get(sum)).toBe(5);
    store.set(a, 10);
    expect(store.get(sum)).toBe(13);
    store.set(b, 20);
    expect(store.get(sum)).toBe(30);
  });

  test("chained selectors", () => {
    const store = new Mimir();
    const base = atom({ key: "chain-base", default: 2 });
    const doubled = selector({
      key: "chain-doubled",
      get: ({ get }: any) => get(base) * 2,
    });
    const quadrupled = selector({
      key: "chain-quad",
      get: ({ get }: any) => get(doubled) * 2,
    });
    expect(store.get(quadrupled)).toBe(8);
    store.set(base, 5);
    expect(store.get(quadrupled)).toBe(20);
  });

  test("notifies selector subscribers when dependency changes", () => {
    const store = new Mimir();
    const base = atom({ key: "sn1", default: 1 });
    const derived = selector({
      key: "sn1-derived",
      get: ({ get }: any) => get(base) + 10,
    });
    store.get(derived);
    let notifiedValue = -1;
    store.subscribe(derived, (v: number) => { notifiedValue = v; });
    store.set(base, 5);
    expect(notifiedValue).toBe(15);
  });
});

describe("Mimir.clearSession", () => {
  test("resets all atoms to defaults", () => {
    const store = new Mimir();
    const a = atom({ key: "cs1", default: 0 });
    const b = atom({ key: "cs2", default: "hi" });
    store.set(a, 99);
    store.set(b, "bye");
    store.clearSession();
    expect(store.get(a)).toBe(0);
    expect(store.get(b)).toBe("hi");
  });

  test("notifies listeners of changed atoms", () => {
    const store = new Mimir();
    const a = atom({ key: "csn1", default: 0 });
    store.set(a, 10);
    let notified = false;
    store.subscribe(a, () => { notified = true; });
    store.clearSession();
    expect(notified).toBe(true);
  });

  test("does not notify if atom was already at default", () => {
    const store = new Mimir();
    const a = atom({ key: "csn2", default: 0 });
    let notified = false;
    store.subscribe(a, () => { notified = true; });
    store.clearSession();
    expect(notified).toBe(false);
  });
});

describe("createStore (server-side)", () => {
  test("set and dehydrate", () => {
    const a = atom({ key: "srv1", default: 0 });
    const b = atom({ key: "srv2", default: "" });
    const store = createStore();
    store.set(a, 42);
    store.set(b, "hello");
    const data = store.dehydrate();
    expect(data.srv1).toBe(42);
    expect(data.srv2).toBe("hello");
  });

  test("chained set calls", () => {
    const a = atom({ key: "ch1", default: 0 });
    const b = atom({ key: "ch2", default: 0 });
    const data = createStore().set(a, 1).set(b, 2).dehydrate();
    expect(data.ch1).toBe(1);
    expect(data.ch2).toBe(2);
  });

  test("dehydrate returns empty object when no sets", () => {
    const data = createStore().dehydrate();
    expect(Object.keys(data).length).toBe(0);
  });

  test("throws for selector", () => {
    const sel = selector({ key: "srv-sel", get: () => 0 });
    expect(() => createStore().set(sel as any, 1)).toThrow();
  });
});

describe("Mimir.snapshot", () => {
  test("returns all current values", () => {
    const store = new Mimir();
    const a = atom({ key: "snap1", default: 1 });
    const b = atom({ key: "snap2", default: 2 });
    store.get(a);
    store.get(b);
    store.set(a, 10);
    const snap = store.snapshot();
    expect(snap.snap1).toBe(10);
    expect(snap.snap2).toBe(2);
  });
});

describe("Mimir.hydrate", () => {
  test("bulk-sets values", () => {
    const store = new Mimir();
    const a = atom({ key: "hyd1", default: 0 });
    const b = atom({ key: "hyd2", default: "" });
    store.get(a);
    store.get(b);
    store.hydrate({ hyd1: 99, hyd2: "loaded" });
    expect(store.get(a)).toBe(99);
    expect(store.get(b)).toBe("loaded");
  });

  test("ignores null/undefined input", () => {
    const store = new Mimir();
    store.hydrate(null as any);
    store.hydrate(undefined as any);
  });
});

describe("global mimir instance", () => {
  test("mimir is an instance of Mimir", () => {
    expect(mimir instanceof Mimir).toBe(true);
  });

  test("global instance works end-to-end", () => {
    const a = atom({ key: "__global_test__", default: 0 });
    mimir.set(a, 42);
    expect(mimir.get(a)).toBe(42);
    mimir.reset(a);
    expect(mimir.get(a)).toBe(0);
  });
});

describe("Mimir class export", () => {
  test("Mimir can be instantiated for isolated stores", () => {
    const s1 = new Mimir();
    const s2 = new Mimir();
    const a = atom({ key: "iso", default: 0 });
    s1.set(a, 1);
    s2.set(a, 2);
    expect(s1.get(a)).toBe(1);
    expect(s2.get(a)).toBe(2);
  });
});
