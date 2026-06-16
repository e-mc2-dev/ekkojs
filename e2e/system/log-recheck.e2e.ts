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
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
function capture(fn: () => void): any[] {
  const lines: string[] = [];
  const orig = console.error;
  (console as any).error = (...a: any[]) => { lines.push(a.join(" ")); };
  try { fn(); } finally { (console as any).error = orig; }
  return lines.map((l) => { try { return JSON.parse(l); } catch { return { _raw: l }; } });
}

t.group("field-name collisions (lock actual override behavior)");
{
  
  const e = capture(() => log.info("m", { level: "CUSTOM", extra: 1 }))[0];
  t.eq("fields.level overrides", e.level, "CUSTOM");
  t.eq("real msg still present", e.msg, "m");
}
{
  
  const l = createLogger("svc", { msg: "ctx-msg" });
  const e = capture(() => l.info("real"))[0];
  t.eq("real msg wins over ctx.msg", e.msg, "real");
}

t.group("unicode + control chars round-trip through JSON");
{
  const e = capture(() => log.info("café 😀 日本\tend", { v: "a\nb\tc\"d" }))[0];
  t.eq("unicode msg preserved", e.msg, "café 😀 日本\tend");
  t.eq("control chars in field preserved", e.v, "a\nb\tc\"d");
}

t.group("deep child chain accumulates context");
{
  const a = createLogger("svc", { l1: 1 });
  const d = a.child({ l2: 2 }).child({ l3: 3 }).child({ l4: 4 });
  const e = capture(() => d.info("deep"))[0];
  t.eq("l1", e.l1, 1); t.eq("l2", e.l2, 2); t.eq("l3", e.l3, 3); t.eq("l4", e.l4, 4);
  t.eq("logger name carried", e.logger, "svc");
}
{
  
  const a = createLogger("s", { k: "a" });
  t.eq("child overrides ctx key", capture(() => a.child({ k: "b" }).info("x"))[0].k, "b");
}

t.group("field value types preserved");
{
  const e = capture(() => log.info("m", { i: 42, f: 3.14, b: false, s: "x", arr: [1, "two", null], o: { nested: true } }))[0];
  t.eq("int", e.i, 42); t.eq("float", e.f, 3.14); t.eq("bool", e.b, false); t.eq("str", e.s, "x");
  t.deep("array", e.arr, [1, "two", null]);
  t.deep("object", e.o, { nested: true });
}

t.group("ts + edge messages");
{
  const e = capture(() => { log.info("a"); log.info("b"); });
  t.check("ts #1 ISO", ISO.test(e[0].ts));
  t.check("ts monotonic non-decreasing", e[1].ts >= e[0].ts);
}
t.notThrows("empty msg", () => capture(() => log.info("")));
t.notThrows("undefined msg", () => capture(() => (log as any).info(undefined)));
t.eq("empty string msg recorded", capture(() => log.info(""))[0].msg, "");

t.done("ekko:log recheck");
