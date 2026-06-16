// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { mock } from "ekko:test";
import { asserter } from "../_harness.ts";

const t = asserter();

t.group("mock.fn");
{
  const f = mock.fn((a: number, b: number) => a + b);
  t.eq("returns impl result", f(2, 3), 5);
  f(10, 20);
  t.eq("records call count", f.mock.calls.length, 2);
  t.deep("records args", f.mock.calls[0], [2, 3]);
  t.deep("records result", f.mock.results[0], { type: "return", value: 5 });
  f.mockReturnValue(99);
  t.eq("mockReturnValue overrides", f(), 99);
  f.mockImplementation(() => "z");
  t.eq("mockImplementation overrides", f(), "z");
  f.mockReset();
  t.eq("mockReset clears calls", f.mock.calls.length, 0);
  t.type("mockReset restores original impl undefined-return for no-arg", f(), "number"); 
  const g = mock((x: number) => x * 2); 
  t.eq("callable shorthand works", g(4), 8);
  const thrower = mock.fn(() => { throw new Error("boom"); });
  t.throws("records thrown result", () => thrower(), /boom/);
  t.eq("thrown result recorded", thrower.mock.results[0].type, "throw");
}

t.group("mock.method / spyOn");
{
  const svc = { greet(n: string) { return "hi " + n; } };
  const spy = mock.method(svc, "greet", () => "MOCKED");
  t.eq("method replaced", svc.greet("a"), "MOCKED");
  t.deep("method records args", spy.mock.calls[0], ["a"]);
  spy.mockRestore();
  t.eq("mockRestore restores original", svc.greet("a"), "hi a");

  const calc = { add(a: number, b: number) { return a + b; } };
  const s2 = mock.spyOn(calc, "add");
  t.eq("spyOn keeps original behavior", calc.add(3, 4), 7);
  t.eq("spyOn records the call", s2.mock.calls.length, 1);
  s2.mockRestore();

  t.throws("mocking a missing method throws", () => mock.method({} as Record<string, unknown>, "nope"), /not found/);
  t.notThrows("double restore is safe", () => { const s = mock.method(svc, "greet"); s.mockRestore(); s.mockRestore(); });
}

t.group("restoreAll");
{
  const o = { a() { return 1; }, b() { return 2; } };
  mock.method(o, "a", () => 10);
  mock.method(o, "b", () => 20);
  t.eq("a mocked", o.a(), 10);
  mock.restoreAll();
  t.eq("a restored by restoreAll", o.a(), 1);
  t.eq("b restored by restoreAll", o.b(), 2);
}

t.group("fake timers");
{
  mock.useFakeTimers();
  let fired = false;
  setTimeout(() => { fired = true; }, 100);
  mock.advanceTimersByTime(99);
  t.check("not fired before delay", fired === false);
  mock.advanceTimersByTime(1);
  t.check("fired exactly at delay", fired === true);

  let n = 0;
  const iv = setInterval(() => { n++; }, 10);
  mock.advanceTimersByTime(35);
  t.eq("interval fired 3x in 35ms", n, 3);
  clearInterval(iv);
  mock.advanceTimersByTime(100);
  t.eq("cleared interval stops", n, 3);

  let cancelled = false;
  const id = setTimeout(() => { cancelled = true; }, 5);
  clearTimeout(id);
  mock.runAllTimers();
  t.check("clearTimeout cancels", cancelled === false);

  const order: number[] = [];
  setTimeout(() => order.push(2), 20);
  setTimeout(() => order.push(1), 10);
  mock.runAllTimers();
  t.deep("runAllTimers drains in time order", order, [1, 2]);

  let reentrant = false;
  setTimeout(() => { setTimeout(() => { reentrant = true; }, 1); }, 1);
  mock.runOnlyPendingTimers();
  t.check("runOnlyPendingTimers ignores newly-scheduled", reentrant === false);

  mock.setSystemTime(1000);
  t.eq("Date.now follows setSystemTime", Date.now(), 1000);
  t.eq("new Date() follows fake clock", new Date().getTime(), 1000);
  mock.advanceTimersByTime(500);
  t.eq("advancing moves the clock", Date.now(), 1500);

  setInterval(() => {}, 0); 
  t.throws("runaway interval guarded", () => mock.advanceTimersByTime(10_000_000), /runaway/);

  mock.useRealTimers();
  t.type("useRealTimers restores native setTimeout", setTimeout, "function");
}

t.group("real timers after restore");
await new Promise<void>((r) => setTimeout(r, 5)); 
t.check("real setTimeout elapsed", true);

t.group("mock.module (dynamic import)");
{
  mock.module("ekko:crypto", { randomUUID: () => "FIXED" });
  const c1 = await import("ekko:crypto") as { randomUUID: () => string };
  t.eq("mocked dynamic import wins", c1.randomUUID(), "FIXED");
  mock.unmockModule("ekko:crypto");
  const c2 = await import("ekko:crypto") as { randomUUID: () => string };
  t.type("real randomUUID is a function", c2.randomUUID, "function");
  const uuid = c2.randomUUID();
  t.ne("unmock restores real module", uuid, "FIXED");
  t.check("real randomUUID returns a uuid", /^[0-9a-f-]{36}$/i.test(uuid));
}

t.group("mock.module (relative path, canonical key)");
{

  mock.module("./_mockfix/dep", { who: () => "MOCKED" });
  const consumer = await import("./_mockfix/consumer") as { ask: () => string };
  t.eq("dynamically-imported unit's static dep is mocked", consumer.ask(), "MOCKED");
  mock.unmockModule("./_mockfix/dep");
}

t.group("recheck");
{
  t.notThrows("useRealTimers with no fake timers active", () => mock.useRealTimers());
  t.notThrows("restoreAll with nothing mocked", () => mock.restoreAll());
  mock.useFakeTimers();
  mock.useFakeTimers(); 
  t.notThrows("nested useFakeTimers is safe", () => mock.advanceTimersByTime(1));
  mock.useRealTimers();
  t.throws("mock.module with non-object factory throws", () => mock.module("x", 5 as unknown as Record<string, unknown>), /object/);
}

t.done("ekko:test mock + fake timers covered");
