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

describe("createStore (server dehydration)", () => {
  test("creates empty store", () => {
    const store = createStore();
    const data = store.dehydrate();
    expect(Object.keys(data).length).toBe(0);
  });

  test("set + dehydrate produces atom key/value pairs", () => {
    const a = atom({ key: "srv-product", default: null });
    const b = atom({ key: "srv-count", default: 0 });
    const store = createStore();
    store.set(a, { id: 1, name: "Widget" });
    store.set(b, 42);
    const data = store.dehydrate();
    expect(data["srv-product"].id).toBe(1);
    expect(data["srv-product"].name).toBe("Widget");
    expect(data["srv-count"]).toBe(42);
  });

  test("chainable set calls", () => {
    const a = atom({ key: "c1", default: 0 });
    const b = atom({ key: "c2", default: "" });
    const data = createStore().set(a, 10).set(b, "hello").dehydrate();
    expect(data["c1"]).toBe(10);
    expect(data["c2"]).toBe("hello");
  });

  test("throws when setting selector", () => {
    const sel = selector({ key: "sel1", get: () => 0 });
    expect(() => createStore().set(sel as any, 1)).toThrow();
  });

  test("dehydrate returns plain object (serializable)", () => {
    const a = atom({ key: "ser1", default: [] as any[] });
    const data = createStore().set(a, [1, 2, 3]).dehydrate();
    expect(JSON.stringify(data)).toBe('{"ser1":[1,2,3]}');
  });

  test("dehydrate with nested objects", () => {
    const a = atom({ key: "nest1", default: {} as any });
    const data = createStore().set(a, { user: { name: "Alice", age: 30 } }).dehydrate();
    expect(data["nest1"].user.name).toBe("Alice");
    expect(data["nest1"].user.age).toBe(30);
  });

  test("dehydrate with null values", () => {
    const a = atom({ key: "null1", default: "not null" as any });
    const data = createStore().set(a, null).dehydrate();
    expect(data["null1"]).toBe(null);
  });
});

describe("initStore + createStore round-trip", () => {
  test("dehydrate on server → initStore on client", () => {
    const productAtom = atom({ key: "rt-product", default: null as any });
    const countAtom = atom({ key: "rt-count", default: 0 });

    const serverStore = createStore();
    serverStore.set(productAtom, { id: 42, name: "Gadget" });
    serverStore.set(countAtom, 7);
    const serialized = serverStore.dehydrate();

    const clientMimir = new Mimir();
    clientMimir._ensureAtom(productAtom);
    clientMimir._ensureAtom(countAtom);
    clientMimir.initStore(serialized);

    expect(clientMimir.get(productAtom).id).toBe(42);
    expect(clientMimir.get(productAtom).name).toBe("Gadget");
    expect(clientMimir.get(countAtom)).toBe(7);
  });

  test("__force override in round-trip", () => {
    const priceAtom = atom({ key: "rt-price", default: 0 });

    const serverStore = createStore();
    serverStore.set(priceAtom, { __value: 99, __force: true } as any);
    const serialized = serverStore.dehydrate();

    const clientMimir = new Mimir();
    clientMimir._ensureAtom(priceAtom);
    clientMimir.set(priceAtom, 50);
    clientMimir.initStore(serialized);

    expect(clientMimir.get(priceAtom)).toBe(99);
  });

  test("atoms not in server store keep defaults", () => {
    const a = atom({ key: "rt-default", default: "original" });
    const b = atom({ key: "rt-set", default: 0 });

    const serialized = createStore().set(b, 42).dehydrate();

    const clientMimir = new Mimir();
    clientMimir._ensureAtom(a);
    clientMimir._ensureAtom(b);
    clientMimir.initStore(serialized);

    expect(clientMimir.get(a)).toBe("original");
    expect(clientMimir.get(b)).toBe(42);
  });
});

describe("__atoms extraction pattern", () => {
  test("getProps __atoms pattern: props with __atoms", () => {
    const cartAtom = atom({ key: "cart", default: [] as any[] });

    const store = createStore();
    store.set(cartAtom, [{ id: 1, qty: 2 }]);
    const props = {
      title: "Shop",
      __atoms: store.dehydrate(),
    };

    expect(props.__atoms.cart.length).toBe(1);
    expect(props.__atoms.cart[0].id).toBe(1);

    const atomsData = props.__atoms;
    delete (props as any).__atoms;

    expect((props as any).__atoms).toBe(undefined);
    expect(props.title).toBe("Shop");

    expect(atomsData.cart[0].id).toBe(1);
  });

  test("getProps without __atoms: no extraction needed", () => {
    const props = { title: "About", content: "Hello" };
    const atoms = (props as any).__atoms;
    expect(atoms).toBe(undefined);
  });
});

describe("session mode in __EKKO_DATA__", () => {
  test("mimir._sessionMode accessible", () => {
    const store = new Mimir();
    store.session("ephemeral");
    expect((store as any)._sessionMode).toBe("ephemeral");
  });

  test("none mode not included in data", () => {
    const store = new Mimir();
    const mode = (store as any)._sessionMode;
    expect(mode).toBe("none");
    const includeMode = mode !== "none" ? mode : undefined;
    expect(includeMode).toBe(undefined);
  });

  test("ephemeral mode included in data", () => {
    const store = new Mimir();
    store.session("ephemeral");
    const mode = (store as any)._sessionMode;
    const includeMode = mode !== "none" ? mode : undefined;
    expect(includeMode).toBe("ephemeral");
  });

  test("domain mode included in data", () => {
    const store = new Mimir();
    store.session("domain");
    const mode = (store as any)._sessionMode;
    const includeMode = mode !== "none" ? mode : undefined;
    expect(includeMode).toBe("domain");
  });
});

describe("globalThis.__mimir", () => {
  test("global mimir is on globalThis", () => {
    expect((globalThis as any).__mimir).toBe(mimir);
  });

  test("globalThis.__mimir is same instance as import", () => {
    (globalThis as any).__mimir.set(atom({ key: "__gtest", default: 0 }), 42);
    expect(mimir.get(atom({ key: "__gtest", default: 0 }))).toBe(42);
  });
});

describe("full SSR simulation", () => {
  test("server prefills → serialize → client hydrate → hooks read", () => {
    const userAtom = atom({ key: "sim-user", default: null as any });
    const themeAtom = atom({ key: "sim-theme", default: "light" });

    const serverStore = createStore();
    serverStore.set(userAtom, { name: "Bob", role: "admin" });
    serverStore.set(themeAtom, "dark");

    const __atoms = serverStore.dehydrate();
    const json = JSON.stringify({ page: "/home", props: {}, __atoms });
    const data = JSON.parse(json);

    expect(data.__atoms["sim-user"].name).toBe("Bob");
    expect(data.__atoms["sim-theme"]).toBe("dark");

    const clientMimir = new Mimir();
    clientMimir._ensureAtom(userAtom);
    clientMimir._ensureAtom(themeAtom);
    clientMimir.initStore(data.__atoms);

    expect(clientMimir.get(userAtom).name).toBe("Bob");
    expect(clientMimir.get(userAtom).role).toBe("admin");
    expect(clientMimir.get(themeAtom)).toBe("dark");
  });

  test("SPA navigation: data endpoint with __atoms", () => {
    const cartAtom = atom({ key: "sim-cart", default: [] as any[] });

    const serverStore = createStore();
    serverStore.set(cartAtom, [{ id: 1 }, { id: 2 }]);

    const respData = {
      props: { title: "Cart" },
      page: "/cart",
      __atoms: serverStore.dehydrate(),
    };
    const json = JSON.stringify(respData);
    const d = JSON.parse(json);

    expect(d.__atoms["sim-cart"].length).toBe(2);

    const clientMimir = new Mimir();
    clientMimir._ensureAtom(cartAtom);
    if (d.__atoms) clientMimir.initStore(d.__atoms);

    expect(clientMimir.get(cartAtom).length).toBe(2);
    expect(clientMimir.get(cartAtom)[0].id).toBe(1);
  });
});
