// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { atom, selector, mimir, createStore, Mimir, useAtom, useAtomValue, useSetAtom } from "ekko:rune/mimir";
import { asserter } from "../_harness.ts";

const t = asserter();

t.group("atom validation + shape");
t.throws("missing key throws", () => atom({ default: 1 } as any), /key/i);
t.throws("missing default throws", () => atom({ key: "x" } as any), /default/i);
{
  const a = atom({ key: "a", default: 5 });
  t.eq("default exposed", a.default, 5);
  t.eq("key exposed", a.key, "a");
  t.eq("persist default true", a.persist, true);
}

t.group("Mimir get/set/updater/reset");
{
  const m = new Mimir();
  const c = atom({ key: "c", default: 0 });
  t.eq("get default", m.get(c), 0);
  m.set(c, 5); t.eq("get after set", m.get(c), 5);
  m.set(c, (p: number) => p + 1); t.eq("updater fn", m.get(c), 6);
  m.reset(c); t.eq("reset → default", m.get(c), 0);
  t.deep("snapshot", m.snapshot(), { c: 0 });
}

t.group("subscribe / unsubscribe");
{
  const m = new Mimir(); const c = atom({ key: "c", default: 0 });
  const got: any[] = []; const unsub = m.subscribe(c, (v: any) => got.push(v));
  m.set(c, 1); m.set(c, 2);
  t.deep("notified each change", got, [1, 2]);
  m.set(c, 2); t.deep("same value skipped (Object.is)", got, [1, 2]);
  unsub(); m.set(c, 3); t.deep("unsub stops", got, [1, 2]);
  t.notThrows("double unsub safe", () => unsub());
  t.throws("non-function callback throws", () => m.subscribe(c, 123 as any), /function/i);
}

t.group("selector compute / recompute / chained");
{
  const m = new Mimir(); const c = atom({ key: "c", default: 2 });
  const dbl = selector({ key: "dbl", get: (g: any) => g.get(c) * 2 });
  t.eq("computes", m.get(dbl), 4);
  m.set(c, 10); t.eq("recomputes", m.get(dbl), 20);
  const quad = selector({ key: "quad", get: (g: any) => g.get(dbl) * 2 });
  t.eq("chained selector", m.get(quad), 40);
  const sum = selector({ key: "sum", get: (g: any) => g.get(c) + g.get(dbl) });
  t.eq("selector reading 2 atoms", m.get(sum), 30);
  t.throws("set selector throws", () => m.set(dbl as any, 1), /atom/i);
  t.throws("reset selector throws", () => m.reset(dbl as any), /atom/i);
}

t.group("createStore dehydrate + initStore");
{
  const c = atom({ key: "c", default: 0 });
  const s = createStore(); s.set(c, 1, { force: true });
  t.deep("dehydrate force", s.dehydrate(), { c: { __force: true, __value: 1 } });
  const s2 = createStore(); s2.set(c, 2);
  t.deep("dehydrate plain", s2.dehydrate(), { c: 2 });
  const m = new Mimir(); m.initStore({ c: { __force: true, __value: 99 } });
  t.eq("initStore force", m.get(c), 99);
  const m2 = new Mimir(); m2.set(c, 1); m2.initStore({ c: 50 });
  t.eq("initStore plain only-if-absent (keeps 1)", m2.get(c), 1);
}

t.group("hydrate + store isolation");
{
  const c = atom({ key: "c", default: 0 });
  const m = new Mimir(); m.hydrate({ c: 42 }); t.eq("hydrate", m.get(c), 42);
  const a = new Mimir(), b = new Mimir(); a.set(c, 1); b.set(c, 2);
  t.deep("stores isolated", [a.get(c), b.get(c)], [1, 2]);
}

t.group("hooks (global mimir)");
t.check("useAtom returns [value,setter]", (() => { const [v, set] = useAtom(atom({ key: "h1", default: 3 })); return v === 3 && typeof set === "function"; })());
t.eq("useAtomValue", useAtomValue(atom({ key: "h2", default: 7 })), 7);
t.eq("useSetAtom sets global", (() => { const a = atom({ key: "h3", default: 0 }); useSetAtom(a)(9); return useAtomValue(a); })(), 9);
t.throws("useSetAtom on selector throws", () => useSetAtom(selector({ key: "hs", get: () => 1 }) as any), /atom/i);

t.done("ekko:rune/mimir covered");
