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
import { atom, selector, mimir, Mimir } from "ekko:rune/mimir";

describe("mimir.session(mode)", () => {
  test("sets mode to none", () => {
    const store = new Mimir();
    store.session("none");
    expect((store as any)._sessionMode).toBe("none");
  });

  test("sets mode to ephemeral", () => {
    const store = new Mimir();
    store.session("ephemeral");
    expect((store as any)._sessionMode).toBe("ephemeral");
  });

  test("sets mode to domain", () => {
    const store = new Mimir();
    store.session("domain");
    expect((store as any)._sessionMode).toBe("domain");
  });

  test("throws for invalid mode", () => {
    const store = new Mimir();
    expect(() => store.session("invalid" as any)).toThrow();
  });

  test("throws for empty string", () => {
    const store = new Mimir();
    expect(() => store.session("" as any)).toThrow();
  });

  test("defaults to none", () => {
    const store = new Mimir();
    expect((store as any)._sessionMode).toBe("none");
  });

  test("can change mode", () => {
    const store = new Mimir();
    store.session("ephemeral");
    expect((store as any)._sessionMode).toBe("ephemeral");
    store.session("domain");
    expect((store as any)._sessionMode).toBe("domain");
    store.session("none");
    expect((store as any)._sessionMode).toBe("none");
  });
});

describe("atom persist flag", () => {
  test("persist defaults to true", () => {
    const a = atom({ key: "p1", default: 0 });
    expect(a.persist).toBe(true);
  });

  test("persist can be false", () => {
    const a = atom({ key: "p2", default: 0, persist: false });
    expect(a.persist).toBe(false);
  });

  test("persist true is explicit", () => {
    const a = atom({ key: "p3", default: 0, persist: true });
    expect(a.persist).toBe(true);
  });

  test("persist flag is frozen", () => {
    const a = atom({ key: "p4", default: 0 });
    expect(Object.isFrozen(a)).toBe(true);
  });
});

describe("initStore (server-side)", () => {
  test("applies server atoms", () => {
    const store = new Mimir();
    const a = atom({ key: "is1", default: 0 });
    store._ensureAtom(a);
    store.initStore({ is1: 42 });
    expect(store.get(a)).toBe(42);
  });

  test("applies multiple atoms", () => {
    const store = new Mimir();
    const a = atom({ key: "is2a", default: 0 });
    const b = atom({ key: "is2b", default: "" });
    store._ensureAtom(a);
    store._ensureAtom(b);
    store.initStore({ is2a: 10, is2b: "hello" });
    expect(store.get(a)).toBe(10);
    expect(store.get(b)).toBe("hello");
  });

  test("__force override extracts __value", () => {
    const store = new Mimir();
    const a = atom({ key: "is3", default: 0 });
    store._ensureAtom(a);
    store.set(a, 999);
    store.initStore({ is3: { __value: 42, __force: true } });
    expect(store.get(a)).toBe(42);
  });

  test("non-force object stored as-is", () => {
    const store = new Mimir();
    const a = atom({ key: "is4", default: {} as any });
    store._ensureAtom(a);
    store.initStore({ is4: { x: 1, y: 2 } });
    expect(store.get(a).x).toBe(1);
    expect(store.get(a).y).toBe(2);
  });

  test("ignores null/undefined input", () => {
    const store = new Mimir();
    store.initStore(null as any);
    store.initStore(undefined as any);
  });

  test("__force false does NOT extract __value", () => {
    const store = new Mimir();
    const a = atom({ key: "is5", default: {} as any });
    store._ensureAtom(a);
    store.initStore({ is5: { __value: 42, __force: false } });
    const val = store.get(a);
    expect(val.__value).toBe(42);
    expect(val.__force).toBe(false);
  });
});

describe("clearSession (server-side)", () => {
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

  test("notifies subscribers on clearSession", () => {
    const store = new Mimir();
    const a = atom({ key: "csn1", default: 0 });
    store.set(a, 10);
    let notified = false;
    store.subscribe(a, () => { notified = true; });
    store.clearSession();
    expect(notified).toBe(true);
  });

  test("clearSession works with session mode set", () => {
    const store = new Mimir();
    store.session("ephemeral");
    const a = atom({ key: "csm1", default: 0 });
    store.set(a, 42);
    store.clearSession();
    expect(store.get(a)).toBe(0);
  });
});

describe("session + initStore integration", () => {
  test("none mode: initStore applies server atoms", () => {
    const store = new Mimir();
    store.session("none");
    const a = atom({ key: "si1", default: 0 });
    store._ensureAtom(a);
    store.initStore({ si1: 100 });
    expect(store.get(a)).toBe(100);
  });

  test("initStore then get returns server value", () => {
    const store = new Mimir();
    const a = atom({ key: "si2", default: "default" });
    store._ensureAtom(a);
    store.initStore({ si2: "from-server" });
    expect(store.get(a)).toBe("from-server");
  });

  test("set after initStore overrides", () => {
    const store = new Mimir();
    const a = atom({ key: "si3", default: 0 });
    store._ensureAtom(a);
    store.initStore({ si3: 10 });
    store.set(a, 20);
    expect(store.get(a)).toBe(20);
  });

  test("reset after initStore goes back to default (not server value)", () => {
    const store = new Mimir();
    const a = atom({ key: "si4", default: 0 });
    store._ensureAtom(a);
    store.initStore({ si4: 100 });
    store.reset(a);
    expect(store.get(a)).toBe(0);
  });
});

describe("global mimir session", () => {
  test("global mimir starts with none", () => {
    expect((mimir as any)._sessionMode).toBe("none");
  });

  test("global mimir session can be set", () => {
    mimir.session("ephemeral");
    expect((mimir as any)._sessionMode).toBe("ephemeral");
    mimir.session("none");
  });
});
