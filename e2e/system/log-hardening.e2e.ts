// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


import { log, createLogger } from "ekko:log";
import { asserter } from "../_harness.ts";

const t = asserter();
function capture(fn: () => void): any[] {
  const lines: string[] = [];
  const orig = console.error;
  (console as any).error = (...a: any[]) => { lines.push(a.join(" ")); };
  try { fn(); } finally { (console as any).error = orig; }
  return lines.map((l) => { try { return JSON.parse(l); } catch { return { _raw: l }; } });
}

t.group("never throws on BigInt fields (was a throw)");
t.notThrows("bigint field no throw", () => { capture(() => log.info("m", { n: 10n })); });
{
  const e = capture(() => log.info("m", { n: 10n, big: 9007199254740993n }))[0];
  t.eq("bigint → string with n suffix", e.n, "10n");
  t.eq("large bigint serialized", e.big, "9007199254740993n");
}

t.group("never throws on circular references (was a throw)");
t.notThrows("circular field no throw", () => {
  const c: any = { name: "x" }; c.self = c;
  capture(() => log.info("m", { c }));
});
{
  const c: any = { name: "node" }; c.self = c;
  const e = capture(() => log.info("m", { c }))[0];
  t.eq("circular ref replaced with [Circular]", e.c.self, "[Circular]");
  t.eq("non-circular part preserved", e.c.name, "node");
}
t.notThrows("nested deep circular no throw", () => {
  const a: any = { x: { y: {} } }; a.x.y.back = a;
  capture(() => log.error("deep", { a }));
});
t.notThrows("array containing a cycle no throw", () => {
  const arr: any[] = [1, 2]; arr.push(arr);
  capture(() => log.info("arr", { arr }));
});

t.group("functions / undefined / throwing getter");
{
  const e = capture(() => log.info("m", { f: () => 1, u: undefined, n: 5 }))[0];
  t.eq("function field dropped", e.f, undefined);
  t.eq("undefined field dropped", e.u, undefined);
  t.eq("normal field kept alongside", e.n, 5);
}
t.notThrows("field with throwing getter does not crash logging", () => {
  const bad: any = {}; Object.defineProperty(bad, "boom", { enumerable: true, get() { throw new Error("getter boom"); } });
  capture(() => log.info("m", { bad }));
});

t.group("the production scenario — logging a caught error with a cycle");
t.notThrows("log.error in catch with circular error object", () => {
  let err: any;
  try { const e: any = new Error("original"); e.ctx = {}; e.ctx.self = e.ctx; throw e; }
  catch (e) { err = e; }
  capture(() => log.error("operation failed", { err: { message: (err as Error).message, ctx: (err as any).ctx } }));
});

t.group("large / stress");
t.notThrows("100KB message no throw", () => { capture(() => log.info("x".repeat(100000))); });
t.notThrows("many fields no throw", () => {
  const f: any = {}; for (let i = 0; i < 1000; i++) f["k" + i] = i;
  capture(() => log.info("m", f));
});

t.done("ekko:log hardening");
