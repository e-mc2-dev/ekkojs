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
import { atom, selector, mimir, Mimir, useAtom, useAtomValue, useSetAtom } from "ekko:rune/mimir";

describe("useAtom (SSR)", () => {
  test("returns [value, setter] tuple", () => {
    const store = mimir;
    const a = atom({ key: "ha1", default: 0 });
    const result = useAtom(a);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]).toBe(0);
    expect(typeof result[1]).toBe("function");
  });

  test("returns current value (not just default)", () => {
    const a = atom({ key: "ha2", default: 10 });
    mimir.set(a, 42);
    const [value] = useAtom(a);
    expect(value).toBe(42);
    mimir.reset(a);
  });

  test("setter updates the store", () => {
    const a = atom({ key: "ha3", default: 0 });
    const [, setter] = useAtom(a);
    setter(99);
    expect(mimir.get(a)).toBe(99);
    mimir.reset(a);
  });

  test("setter supports updater function", () => {
    const a = atom({ key: "ha4", default: 5 });
    const [, setter] = useAtom(a);
    setter((prev: number) => prev + 10);
    expect(mimir.get(a)).toBe(15);
    mimir.reset(a);
  });

  test("works with string atom", () => {
    const a = atom({ key: "ha5", default: "hello" });
    const [value, setter] = useAtom(a);
    expect(value).toBe("hello");
    setter("world");
    expect(mimir.get(a)).toBe("world");
    mimir.reset(a);
  });

  test("works with object atom", () => {
    const a = atom({ key: "ha6", default: { x: 1, y: 2 } });
    const [value] = useAtom(a);
    expect(value.x).toBe(1);
    expect(value.y).toBe(2);
  });

  test("works with null default", () => {
    const a = atom({ key: "ha7", default: null });
    const [value] = useAtom(a);
    expect(value).toBe(null);
  });

  test("works with boolean atom", () => {
    const a = atom({ key: "ha8", default: false });
    const [value, setter] = useAtom(a);
    expect(value).toBe(false);
    setter(true);
    expect(mimir.get(a)).toBe(true);
    mimir.reset(a);
  });
});

describe("useAtomValue (SSR)", () => {
  test("returns atom value", () => {
    const a = atom({ key: "hv1", default: 42 });
    const value = useAtomValue(a);
    expect(value).toBe(42);
  });

  test("returns updated value after set", () => {
    const a = atom({ key: "hv2", default: 0 });
    mimir.set(a, 100);
    const value = useAtomValue(a);
    expect(value).toBe(100);
    mimir.reset(a);
  });

  test("returns selector derived value", () => {
    const base = atom({ key: "hv3", default: 5 });
    const doubled = selector({
      key: "hv3-doubled",
      get: ({ get }: any) => get(base) * 2,
    });
    const value = useAtomValue(doubled);
    expect(value).toBe(10);
  });

  test("selector recomputes after atom change", () => {
    const base = atom({ key: "hv4", default: 3 });
    const tripled = selector({
      key: "hv4-tripled",
      get: ({ get }: any) => get(base) * 3,
    });
    expect(useAtomValue(tripled)).toBe(9);
    mimir.set(base, 10);
    expect(useAtomValue(tripled)).toBe(30);
    mimir.reset(base);
  });

  test("selector with multiple deps", () => {
    const a = atom({ key: "hv5a", default: 2 });
    const b = atom({ key: "hv5b", default: 3 });
    const sum = selector({
      key: "hv5-sum",
      get: ({ get }: any) => get(a) + get(b),
    });
    expect(useAtomValue(sum)).toBe(5);
    mimir.set(a, 10);
    expect(useAtomValue(sum)).toBe(13);
    mimir.reset(a);
  });
});

describe("useSetAtom (SSR)", () => {
  test("returns a setter function", () => {
    const a = atom({ key: "hs1", default: 0 });
    const setter = useSetAtom(a);
    expect(typeof setter).toBe("function");
  });

  test("setter updates the store", () => {
    const a = atom({ key: "hs2", default: 0 });
    const setter = useSetAtom(a);
    setter(42);
    expect(mimir.get(a)).toBe(42);
    mimir.reset(a);
  });

  test("setter supports updater function", () => {
    const a = atom({ key: "hs3", default: 10 });
    const setter = useSetAtom(a);
    setter((prev: number) => prev * 2);
    expect(mimir.get(a)).toBe(20);
    mimir.reset(a);
  });

  test("throws for selector", () => {
    const sel = selector({ key: "hs4", get: () => 0 });
    expect(() => useSetAtom(sel as any)).toThrow();
  });

  test("multiple setters for same atom", () => {
    const a = atom({ key: "hs5", default: 0 });
    const s1 = useSetAtom(a);
    const s2 = useSetAtom(a);
    s1(10);
    expect(mimir.get(a)).toBe(10);
    s2(20);
    expect(mimir.get(a)).toBe(20);
    mimir.reset(a);
  });
});

describe("hooks are exported", () => {
  test("useAtom is a function", () => {
    expect(typeof useAtom).toBe("function");
  });

  test("useAtomValue is a function", () => {
    expect(typeof useAtomValue).toBe("function");
  });

  test("useSetAtom is a function", () => {
    expect(typeof useSetAtom).toBe("function");
  });
});

describe("hooks + subscribe integration (SSR)", () => {
  test("setter triggers subscriber", () => {
    const a = atom({ key: "hi1", default: 0 });
    let notified = false;
    mimir.subscribe(a, () => { notified = true; });
    const [, setter] = useAtom(a);
    setter(5);
    expect(notified).toBe(true);
    mimir.reset(a);
  });

  test("useSetAtom setter triggers subscriber", () => {
    const a = atom({ key: "hi2", default: "" });
    const values: string[] = [];
    mimir.subscribe(a, (v: string) => values.push(v));
    const setter = useSetAtom(a);
    setter("a");
    setter("b");
    setter("c");
    expect(values.length).toBe(3);
    expect(values[0]).toBe("a");
    expect(values[1]).toBe("b");
    expect(values[2]).toBe("c");
    mimir.reset(a);
  });

  test("useAtom reflects latest value after external set", () => {
    const a = atom({ key: "hi3", default: 0 });
    mimir.set(a, 100);
    const [value] = useAtom(a);
    expect(value).toBe(100);
    mimir.reset(a);
  });
});
