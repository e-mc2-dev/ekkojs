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
import { atom, selector, mimir, createStore, Mimir, useAtom, useAtomValue, useSetAtom } from "ekko:rune/mimir";

describe("Atom<T> phantom type shape", () => {
  test("atom<number> has key, default, persist, __brand", () => {
    const a = atom<number>({ key: "tn1", default: 42 });
    expect(a.key).toBe("tn1");
    expect(a.default).toBe(42);
    expect(a.persist).toBe(true);
    expect(a.__brand).toBe("atom");
    expect(Object.isFrozen(a)).toBe(true);
  });

  test("atom<string> types", () => {
    const a = atom<string>({ key: "ts1", default: "hello" });
    expect(typeof a.default).toBe("string");
    expect(a.default).toBe("hello");
  });

  test("atom<object> types", () => {
    const a = atom<{ name: string; age: number }>({
      key: "to1",
      default: { name: "Alice", age: 30 },
    });
    expect(a.default.name).toBe("Alice");
    expect(a.default.age).toBe(30);
  });

  test("atom<array> types", () => {
    const a = atom<number[]>({ key: "ta1", default: [1, 2, 3] });
    expect(a.default.length).toBe(3);
  });

  test("atom<null> types", () => {
    const a = atom<null>({ key: "tnu1", default: null });
    expect(a.default).toBe(null);
  });

  test("atom with persist: false", () => {
    const a = atom<number>({ key: "tp1", default: 0, persist: false });
    expect(a.persist).toBe(false);
  });
});

describe("Selector<T> phantom type shape", () => {
  test("selector<number> has key, get, __brand", () => {
    const base = atom<number>({ key: "sb1", default: 5 });
    const sel = selector<number>({
      key: "ss1",
      get: ({ get }) => get(base) * 2,
    });
    expect(sel.key).toBe("ss1");
    expect(typeof sel.get).toBe("function");
    expect(sel.__brand).toBe("selector");
    expect(Object.isFrozen(sel)).toBe(true);
  });

  test("selector derives correct type from atoms", () => {
    const a = atom<number>({ key: "sd1", default: 3 });
    const b = atom<number>({ key: "sd2", default: 4 });
    const sum = selector<number>({
      key: "sdsum",
      get: ({ get }) => get(a) + get(b),
    });
    expect(mimir.get(sum)).toBe(7);
  });

  test("selector returning string", () => {
    const name = atom<string>({ key: "sds1", default: "world" });
    const greeting = selector<string>({
      key: "sdg1",
      get: ({ get }) => "Hello, " + get(name) + "!",
    });
    expect(mimir.get(greeting)).toBe("Hello, world!");
  });

  test("selector depending on selector", () => {
    const base = atom<number>({ key: "scs1", default: 2 });
    const doubled = selector<number>({
      key: "scs2",
      get: ({ get }) => get(base) * 2,
    });
    const quad = selector<number>({
      key: "scs3",
      get: ({ get }) => get(doubled) * 2,
    });
    expect(mimir.get(quad)).toBe(8);
  });
});

describe("Mimir interface type conformance", () => {
  test("mimir.get returns typed value", () => {
    const a = atom<number>({ key: "mg1", default: 42 });
    const val: number = mimir.get(a);
    expect(val).toBe(42);
  });

  test("mimir.set accepts direct value", () => {
    const a = atom<number>({ key: "ms1", default: 0 });
    mimir.set(a, 42);
    expect(mimir.get(a)).toBe(42);
    mimir.reset(a);
  });

  test("mimir.set accepts updater function", () => {
    const a = atom<number>({ key: "ms2", default: 10 });
    mimir.set(a, (prev: number) => prev + 5);
    expect(mimir.get(a)).toBe(15);
    mimir.reset(a);
  });

  test("mimir.reset restores default", () => {
    const a = atom<number>({ key: "mr1", default: 99 });
    mimir.set(a, 0);
    mimir.reset(a);
    expect(mimir.get(a)).toBe(99);
  });

  test("mimir.subscribe returns unsubscribe function", () => {
    const a = atom<number>({ key: "msub1", default: 0 });
    const unsub = mimir.subscribe(a, (_v: number) => {});
    expect(typeof unsub).toBe("function");
    unsub();
  });

  test("mimir.session accepts SessionMode", () => {
    mimir.session("none");
    mimir.session("ephemeral");
    mimir.session("domain");
    mimir.session("none");
  });

  test("mimir.snapshot returns Record", () => {
    const a = atom<number>({ key: "msnap1", default: 1 });
    mimir.get(a);
    const snap = mimir.snapshot();
    expect(typeof snap).toBe("object");
  });

  test("mimir.hydrate accepts Record", () => {
    mimir.hydrate({ key1: "value1" });
  });

  test("mimir.initStore accepts Record", () => {
    mimir.initStore({ key2: "value2" });
  });
});

describe("ServerStore type conformance", () => {
  test("createStore returns ServerStore", () => {
    const store = createStore();
    expect(typeof store.set).toBe("function");
    expect(typeof store.dehydrate).toBe("function");
  });

  test("store.set is chainable", () => {
    const a = atom<number>({ key: "sst1", default: 0 });
    const b = atom<string>({ key: "sst2", default: "" });
    const data = createStore().set(a, 42).set(b, "hello").dehydrate();
    expect(data["sst1"]).toBe(42);
    expect(data["sst2"]).toBe("hello");
  });

  test("store.dehydrate returns Record<string, any>", () => {
    const data = createStore().dehydrate();
    expect(typeof data).toBe("object");
  });
});

describe("useAtom<T> type conformance", () => {
  test("useAtom returns [T, setter]", () => {
    const a = atom<number>({ key: "ua1", default: 0 });
    const result = useAtom(a);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    const [value, setter] = result;
    expect(typeof value).toBe("number");
    expect(typeof setter).toBe("function");
  });

  test("useAtom setter accepts direct value", () => {
    const a = atom<string>({ key: "ua2", default: "old" });
    const [, setter] = useAtom(a);
    setter("new");
    expect(mimir.get(a)).toBe("new");
    mimir.reset(a);
  });

  test("useAtom setter accepts updater", () => {
    const a = atom<number>({ key: "ua3", default: 5 });
    const [, setter] = useAtom(a);
    setter((prev: number) => prev * 2);
    expect(mimir.get(a)).toBe(10);
    mimir.reset(a);
  });
});

describe("useAtomValue<T> type conformance", () => {
  test("useAtomValue with Atom<T> returns T", () => {
    const a = atom<number>({ key: "uav1", default: 42 });
    const value: number = useAtomValue(a);
    expect(value).toBe(42);
  });

  test("useAtomValue with Selector<T> returns T", () => {
    const base = atom<number>({ key: "uav2", default: 5 });
    const doubled = selector<number>({
      key: "uav2d",
      get: ({ get }) => get(base) * 2,
    });
    const value: number = useAtomValue(doubled);
    expect(value).toBe(10);
  });
});

describe("useSetAtom<T> type conformance", () => {
  test("useSetAtom returns setter function", () => {
    const a = atom<number>({ key: "usa1", default: 0 });
    const setter = useSetAtom(a);
    expect(typeof setter).toBe("function");
  });

  test("setter accepts typed value", () => {
    const a = atom<string>({ key: "usa2", default: "" });
    const setter = useSetAtom(a);
    setter("typed");
    expect(mimir.get(a)).toBe("typed");
    mimir.reset(a);
  });
});

describe("Mimir class constructor export", () => {
  test("Mimir can be instantiated", () => {
    const store = new Mimir();
    expect(typeof store.get).toBe("function");
    expect(typeof store.set).toBe("function");
    expect(typeof store.subscribe).toBe("function");
    expect(typeof store.reset).toBe("function");
    expect(typeof store.clearSession).toBe("function");
    expect(typeof store.session).toBe("function");
    expect(typeof store.snapshot).toBe("function");
    expect(typeof store.hydrate).toBe("function");
    expect(typeof store.initStore).toBe("function");
  });

  test("isolated instances", () => {
    const s1 = new Mimir();
    const s2 = new Mimir();
    const a = atom<number>({ key: "iso1", default: 0 });
    s1.set(a, 1);
    s2.set(a, 2);
    expect(s1.get(a)).toBe(1);
    expect(s2.get(a)).toBe(2);
  });
});

describe("type definition completeness", () => {
  test("all 8 exports exist", () => {
    expect(typeof atom).toBe("function");
    expect(typeof selector).toBe("function");
    expect(typeof createStore).toBe("function");
    expect(typeof mimir).toBe("object");
    expect(typeof Mimir).toBe("function");
    expect(typeof useAtom).toBe("function");
    expect(typeof useAtomValue).toBe("function");
    expect(typeof useSetAtom).toBe("function");
  });
});
