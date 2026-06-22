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
import * as dtMod from "ekko:datetime";

const { datetime } = dtMod;

describe("datetime.add", () => {
  test("adds 1 day", () => {
    const base = datetime.parse("2026-05-02T14:30:00Z");
    const added = datetime.add(base, { days: 1 });
    expect(added.iso).toContain("2026-05-03");
  });

  test("adds 2 hours", () => {
    const base = datetime.parse("2026-05-02T14:00:00Z");
    const added = datetime.add(base, { hours: 2 });
    expect(added.iso).toContain("16:00");
  });

  test("adds multiple days", () => {
    const base = datetime.parse("2026-05-01T00:00:00Z");
    const added = datetime.add(base, { days: 30 });
    expect(added.iso).toContain("2026-05-31");
  });

  test("add negative days subtracts", () => {
    const base = datetime.parse("2026-05-10T00:00:00Z");
    const subtracted = datetime.add(base, { days: -5 });
    expect(subtracted.iso).toContain("2026-05-05");
  });
});

describe("datetime.diff", () => {
  test("diff between dates returns duration", () => {
    const a = datetime.parse("2026-05-03T14:30:00Z");
    const b = datetime.parse("2026-05-02T14:30:00Z");
    const d = datetime.diff(a, b);
    expect(d.days).toBe(1);
  });

  test("diff between same date is 0 days", () => {
    const a = datetime.parse("2026-05-02T14:30:00Z");
    const d = datetime.diff(a, a);
    expect(d.days).toBe(0);
  });
});

describe("datetime.epoch / fromEpoch", () => {
  test("epoch returns a number", () => {
    const ep = datetime.epoch();
    expect(typeof ep).toBe("number");
    expect(ep).toBeGreaterThan(0);
  });

  test("fromEpoch(0) is 1970", () => {
    const from = datetime.fromEpoch(0);
    expect(from.iso).toContain("1970");
  });

  test("epoch then fromEpoch roundtrip", () => {
    const ep = datetime.epoch();
    const from = datetime.fromEpoch(ep);
    expect(typeof from.iso).toBe("string");
    expect(from.epoch).toBe(ep);
  });

  test("fromEpoch of known timestamp", () => {
    
    const from = datetime.fromEpoch(0);
    expect(from.iso).toContain("1970-01-01");
  });
});
