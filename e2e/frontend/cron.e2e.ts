// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { cron } from "ekko:job/cron";
import { asserter } from "../_harness.ts";

const t = asserter();
let _n = 0;
const uniq = () => "j" + (++_n);
function sched(expr: string) { const name = uniq(); const s = cron.schedule(name, expr, () => {}); cron.remove(name); return s; }

t.group("covered — valid expressions accepted");
t.notThrows("every minute *", () => sched("* * * * *"));
t.notThrows("step */15", () => sched("*/15 * * * *"));
t.notThrows("range 1-5 weekday", () => sched("0 0 * * 1-5"));
t.notThrows("list 1,3,5", () => sched("0 0 1,3,5 * *"));
t.notThrows("specific time 30 9 * * *", () => sched("30 9 * * *"));
t.notThrows("combined step+fields", () => sched("*/10 */2 * * *"));

t.group("covered — boundary values accepted");
t.notThrows("minute 0 and 59", () => sched("0 0 * * *") && sched("59 0 * * *"));
t.notThrows("hour 0 and 23", () => sched("0 0 * * *") && sched("0 23 * * *"));
t.notThrows("day 1 and 31", () => sched("0 0 1 * *") && sched("0 0 31 * *"));
t.notThrows("month 1 and 12", () => sched("0 0 1 1 *") && sched("0 0 1 12 *"));
t.notThrows("weekday 0 and 6", () => sched("0 0 * * 0") && sched("0 0 * * 6"));

t.group("covered — schedule management");
{
  const s = cron.schedule("mgmt1", "* * * * *", () => {});
  t.eq("schedule returns name", s.name, "mgmt1");
  t.eq("runCount starts 0", s.runCount, 0);
  t.check("list includes it", cron.list().some((x: any) => x.name === "mgmt1"));
  cron.remove("mgmt1");
  t.check("removed from list", !cron.list().some((x: any) => x.name === "mgmt1"));
  const o = cron.once("o1", Date.now() + 100000, () => {});
  t.eq("once returns type", o.type, "once");
}

t.group("recheck (BUG A) — invalid expressions throw at schedule()");
t.throws("wrong arity (4 fields)", () => sched("* * * *"), /Invalid cron/);
t.throws("wrong arity (6 fields)", () => sched("* * * * * *"), /Invalid cron/);
t.throws("minute out of range (60)", () => sched("60 * * * *"), /Invalid cron/);
t.throws("hour out of range (25)", () => sched("0 25 * * *"), /Invalid cron/);
t.throws("day out of range (32)", () => sched("0 0 32 * *"), /Invalid cron/);
t.throws("day zero (min 1)", () => sched("0 0 0 * *"), /Invalid cron/);
t.throws("month out of range (13)", () => sched("0 0 1 13 *"), /Invalid cron/);
t.throws("weekday out of range (7)", () => sched("0 0 * * 7"), /Invalid cron/);
t.throws("garbage field abc", () => sched("abc * * * *"), /Invalid cron/);
t.throws("reversed range 5-1", () => sched("5-1 * * * *"), /Invalid cron/);
t.throws("out-of-range inside list", () => sched("1,99 * * * *"), /Invalid cron/);
t.throws("out-of-range inside range", () => sched("0-99 * * * *"), /Invalid cron/);
t.throws("step zero */0", () => sched("*/0 * * * *"), /Invalid cron/);

t.group("recheck — valid edges still accepted");
t.notThrows("range within bounds 0-59", () => sched("0-59 * * * *"));
t.notThrows("list within bounds", () => sched("1,15,30,45 * * * *"));
t.notThrows("max step */59", () => sched("*/59 * * * *"));

t.done("ekko:job/cron covered+recheck");
