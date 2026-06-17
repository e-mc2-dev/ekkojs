// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { exec } from "ekko:process";
import { writeText, mkdir, remove, exists } from "ekko:fs";
import { asserter } from "../_harness";

const t = asserter();
const EKKO = Ekko.args[0];
const ROOT = "e2e/_runnertmp";
if (!exists(ROOT)) mkdir(ROOT);

const program = `
import { describe, test, beforeEach, afterEach } from "ekko:test";
describe("outer", () => {
  beforeEach(() => console.log("OUTER_BE"));
  afterEach(() => console.log("OUTER_AE"));
  test("passing", () => {});
  test("failing", () => { throw new Error("boomXYZ"); });
  describe("inner", () => {
    test("nested", () => {});
  });
});
`;
const file = ROOT + "/runner_prog.ts";
writeText(file, program);

const r = await exec(EKKO, ["run", file]);
const out = r.stdout || "";
const count = (s: string) => out.split(s).length - 1;

t.group("runner: afterEach always runs (even on failure) + nested inheritance");
t.eq("afterEach ran for all 3 tests (incl. the failing one)", count("OUTER_AE"), 3);
t.eq("beforeEach ran for all 3 tests (incl. nested → inherited)", count("OUTER_BE"), 3);
t.check("failing test reported with ✗", out.includes("✗") && out.includes("boomXYZ"));
t.check("passing + nested reported with ✓", count("✓") >= 2);
t.check("summary shows 1 failed", /1 failed/.test(out));
t.check("summary shows 2 passed", /2 passed/.test(out));

t.group("runner: skip + only");
const prog2 = `
import { describe, test } from "ekko:test";
describe("s", () => {
  test("a", () => {});
  test.skip("b", () => { throw new Error("should not run"); });
});
`;
const f2 = ROOT + "/runner_skip.ts";
writeText(f2, prog2);
const r2 = await exec(EKKO, ["run", f2]);
t.check("skipped test not failing", /1 passed/.test(r2.stdout) && /1 skipped/.test(r2.stdout));

remove(file); remove(f2); remove(ROOT);
t.done("ekko:test runner");
