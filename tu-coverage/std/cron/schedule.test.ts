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

describe("ekko:cron - schedule", () => {
  test("cron.schedule returns an object", () => {
    const task = cron.schedule("sched-1", "*/5 * * * *", () => {});
    expect(typeof task).toBe("object");
    expect(task).not.toBe(null);
  });

  test("cron.schedule stores name", () => {
    const task = cron.schedule("named-task", "0 * * * *", () => {});
    expect(task.name).toBe("named-task");
  });

  test("cron.schedule stores expression", () => {
    const task = cron.schedule("expr-task", "30 4 * * *", () => {});
    expect(task.expr).toBe("30 4 * * *");
  });

  test("cron.list returns scheduled tasks", () => {
    cron.schedule("list-test-1", "* * * * *", () => {});
    const list = cron.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test("cron.list includes name and expr", () => {
    cron.schedule("list-check", "0 9 * * 1", () => {});
    const list = cron.list();
    const found = list.find((t: any) => t.name === "list-check");
    expect(found).not.toBe(null);
    expect(found).not.toBe(undefined);
    expect(found.expr).toBe("0 9 * * 1");
  });

  test("cron.remove removes by name", () => {
    cron.schedule("to-remove", "* * * * *", () => {});
    cron.remove("to-remove");
    const list = cron.list();
    const found = list.find((t: any) => t.name === "to-remove");
    expect(found).toBe(undefined);
  });

  test("after remove, list is shorter", () => {
    cron.schedule("rem-a", "* * * * *", () => {});
    cron.schedule("rem-b", "* * * * *", () => {});
    const before = cron.list().length;
    cron.remove("rem-a");
    const after = cron.list().length;
    expect(after).toBe(before - 1);
  });

  test("invalid cron expression throws", () => {
    let threw = false;
    try {
      cron.schedule("bad-expr", "not a cron", () => {});
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("schedule with 5-part expression works", () => {
    const task = cron.schedule("five-part", "0 0 1 1 *", () => {});
    expect(task.name).toBe("five-part");
  });

  test("multiple schedules coexist", () => {
    cron.schedule("multi-1", "* * * * *", () => {});
    cron.schedule("multi-2", "*/10 * * * *", () => {});
    cron.schedule("multi-3", "0 0 * * *", () => {});
    const list = cron.list();
    const names = list.map((t: any) => t.name);
    expect(names.includes("multi-1")).toBe(true);
    expect(names.includes("multi-2")).toBe(true);
    expect(names.includes("multi-3")).toBe(true);
  });

  test("cron.start is a function", () => {
    expect(typeof cron.start).toBe("function");
  });

  test("cron.stop is a function", () => {
    expect(typeof cron.stop).toBe("function");
  });
});
