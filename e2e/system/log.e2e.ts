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

t.group("root logger — levels + shape");
{
  const e = capture(() => log.info("hello"));
  t.eq("one line", e.length, 1);
  t.eq("level info", e[0].level, "info");
  t.eq("msg", e[0].msg, "hello");
  t.check("ts is ISO", ISO.test(e[0].ts));
  t.eq("no logger key on root", e[0].logger, undefined);
}
t.eq("warn level", capture(() => log.warn("w"))[0].level, "warn");
t.eq("error level", capture(() => log.error("e"))[0].level, "error");
{
  
  log.setLevel("debug");
  t.eq("debug level", capture(() => log.debug("d"))[0].level, "debug");
  log.setLevel("info");
}

t.group("fields merge into entry");
{
  const e = capture(() => log.info("m", { user: "alice", count: 3, ok: true, nil: null }))[0];
  t.eq("string field", e.user, "alice");
  t.eq("number field", e.count, 3);
  t.eq("bool field", e.ok, true);
  t.eq("null field", e.nil, null);
}
{
  const e = capture(() => log.info("m", { nested: { a: [1, 2] } }))[0];
  t.deep("nested field preserved", e.nested, { a: [1, 2] });
}

t.group("createLogger — name + context");
{
  const svc = createLogger("svc", { reqId: 42 });
  const e = capture(() => svc.info("started"))[0];
  t.eq("logger name", e.logger, "svc");
  t.eq("ctx reqId", e.reqId, 42);
  t.eq("msg", e.msg, "started");
}

t.group("child — context merge + immutability");
{
  const base = createLogger("svc", { a: 1 });
  const child = base.child({ b: 2 });
  const ec = capture(() => child.info("x"))[0];
  t.eq("child has parent ctx a", ec.a, 1);
  t.eq("child has extra b", ec.b, 2);
  const eb = capture(() => base.info("y"))[0];
  t.eq("base unaffected (no b)", eb.b, undefined);
  t.eq("base keeps a", eb.a, 1);
}

t.group("setLevel — filtering + ordering");
{
  log.setLevel("warn");
  const e = capture(() => { log.debug("d"); log.info("i"); log.warn("w"); log.error("e"); });
  t.eq("only warn+error emitted at level=warn", e.length, 2);
  t.deep("levels", e.map((x) => x.level), ["warn", "error"]);
  log.setLevel("error");
  t.eq("only error at level=error", capture(() => { log.warn("w"); log.error("e"); }).length, 1);
  log.setLevel("debug");
  t.eq("all 4 at level=debug", capture(() => { log.debug("d"); log.info("i"); log.warn("w"); log.error("e"); }).length, 4);
  log.setLevel("info"); 
}
t.group("setLevel — invalid is graceful");
{
  log.setLevel("bogus" as any);
  t.eq("invalid level defaults to info (info emits)", capture(() => log.info("x")).length, 1);
  t.eq("debug filtered after invalid (default info)", capture(() => log.debug("x")).length, 0);
}
t.type("info returns undefined", log.info("x"), "undefined");

t.done("ekko:log covered");
