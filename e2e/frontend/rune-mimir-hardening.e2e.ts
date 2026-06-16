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

t.group("circular selector throws (was a stack-overflow crash)");
{
  const m = new Mimir();
  const s1: any = selector({ key: "s1", get: (g: any) => g.get(s1) + 1 });
  t.throws("self-referential selector throws", () => m.get(s1), /circular/i);
}
{
  const m = new Mimir();
  const a: any = selector({ key: "ca", get: (g: any) => g.get(b) + 1 });
  const b: any = selector({ key: "cb", get: (g: any) => g.get(a) + 1 });
  t.throws("A→B→A cycle throws", () => m.get(a), /circular/i);
}
{
  
  const m = new Mimir(); const c = atom({ key: "c", default: 5 });
  const bad: any = selector({ key: "bad", get: (g: any) => g.get(bad) });
  try { m.get(bad); } catch {  }
  const ok = selector({ key: "ok", get: (g: any) => g.get(c) + 1 });
  t.eq("normal selector works after circular throw", m.get(ok), 6);
}

t.group("throwing selector propagates cleanly");
{
  const m = new Mimir();
  const boom = selector({ key: "boom", get: () => { throw new Error("selector boom"); } });
  t.throws("selector throw propagates", () => m.get(boom), /boom/i);
  const c = atom({ key: "c2", default: 1 });
  t.eq("store usable after selector throw", m.get(c), 1);
}

t.group("reentrancy safe (no infinite loop / crash)");
{
  const m = new Mimir(); const c = atom({ key: "rc", default: 0 });
  let calls = 0;
  m.subscribe(c, (v: any) => { calls++; if (v < 3) m.set(c, v + 1); }); 
  m.set(c, 1);
  t.eq("reentrant set converges", m.get(c), 3);
  t.check("subscriber called finitely", calls > 0 && calls < 10);
}
{
  const m = new Mimir(); const c = atom({ key: "uc", default: 0 });
  let u: any; u = m.subscribe(c, () => { u(); }); 
  t.notThrows("unsubscribe-self during notify no crash", () => m.set(c, 1));
}

t.group("large store (perf/memory sane)");
{
  const m = new Mimir();
  const atoms = []; for (let i = 0; i < 1000; i++) atoms.push(atom({ key: "k" + i, default: i }));
  for (const a of atoms) m.set(a, m.get(a) + 1);
  t.eq("1000 atoms set", m.get(atoms[999]), 1000);
  const c = atom({ key: "big", default: 0 }); let n = 0;
  for (let i = 0; i < 1000; i++) m.subscribe(c, () => n++);
  m.set(c, 1); t.eq("1000 subscribers all notified", n, 1000);
}
{
  
  const m = new Mimir(); const base = atom({ key: "base", default: 1 });
  let prev: any = base;
  for (let i = 0; i < 100; i++) { const p = prev; prev = selector({ key: "s" + i, get: (g: any) => g.get(p) + 1 }); }
  t.eq("100-deep selector chain computes", m.get(prev), 101);
}

t.done("ekko:rune/mimir hardening");
