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
import { cron } from "ekko:job/cron";

describe("ekko:cron - expression parsing", () => {
  test("every minute expression schedules without error", () => {
    const task = cron.schedule("every-min", "* * * * *", () => {});
    expect(task.name).toBe("every-min");
  });

  test("every 5 minutes expression schedules", () => {
    const task = cron.schedule("every-5", "*/5 * * * *", () => {});
    expect(task.name).toBe("every-5");
  });

  test("hourly expression schedules", () => {
    const task = cron.schedule("hourly", "0 * * * *", () => {});
    expect(task.name).toBe("hourly");
  });

  test("daily expression schedules", () => {
    const task = cron.schedule("daily", "0 0 * * *", () => {});
    expect(task.name).toBe("daily");
  });

  test("Monday 9am expression schedules", () => {
    const task = cron.schedule("mon-9am", "0 9 * * 1", () => {});
    expect(task.name).toBe("mon-9am");
  });

  test("1st of month 4:30 expression schedules", () => {
    const task = cron.schedule("monthly", "30 4 1 * *", () => {});
    expect(task.name).toBe("monthly");
  });

  test("too few parts throws", () => {
    let threw = false;
    try {
      cron.schedule("bad-few", "* *", () => {});
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("non-numeric parts throw (parseCron validates numeric fields)", () => {

    let threw = false;
    let msg = "";
    try {
      cron.schedule("bad-alpha", "a b c d e", () => {});
    } catch (e: any) {
      threw = true;
      msg = e.message;
    }
    expect(threw).toBe(true);
    expect(msg.includes("Invalid cron field")).toBe(true);
  });

  test("cron.once is a function", () => {
    expect(typeof cron.once).toBe("function");
  });

  test("cron.once returns object with name", () => {
    const future = Date.now() + 60000;
    const task = cron.once("once-task", future, () => {});
    expect(task.name).toBe("once-task");
  });
});
