// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


import { datetime, timezone } from "ekko:datetime";
import { asserter } from "../_harness";

const t = asserter();
const ERR = /.+/; 

t.group("parse — malformed / out-of-range throws cleanly");
t.throws("garbage", () => datetime.parse("not a date"), ERR);
t.throws("empty", () => datetime.parse(""), ERR);
t.throws("month 13", () => datetime.parse("2024-13-01"), ERR);
t.throws("day 45", () => datetime.parse("2024-01-45"), ERR);
t.throws("feb 29 non-leap", () => datetime.parse("2023-02-29T00:00:00Z"), ERR);
t.throws("feb 30", () => datetime.parse("2024-02-30T00:00:00Z"), ERR);
t.throws("parseExact mismatch", () => datetime.parse("2024-01-15", "dd/MM/yyyy"), ERR);

t.group("format — invalid pattern handled (no crash)");
t.throws("bad pattern", () => datetime.format("2024-01-15T00:00:00Z", "￿%%%"), ERR);
t.notThrows("empty pattern (general format)", () => datetime.format("2024-01-15T00:00:00Z", ""));

t.group("add / fromEpoch — overflow handled");
t.throws("add huge days overflows range", () => datetime.add("9999-12-31T00:00:00Z", { days: 1000000 }), ERR);
t.throws("fromEpoch beyond range", () => datetime.fromEpoch(99999999999999999), ERR);
t.notThrows("fromEpoch negative (pre-1970)", () => datetime.fromEpoch(-1000000000));

t.group("timezone — invalid / injection zone throws cleanly");
t.throws("invalid zone Mars/Olympus", () => timezone.convert("2024-01-15T12:00:00Z", "Mars/Olympus"), ERR);
t.throws("invalid zone Not/AZone", () => timezone.info("Not/AZone"), ERR);
t.throws("empty zone", () => timezone.convert("2024-01-15T12:00:00Z", ""), ERR);
t.throws("injection zone", () => timezone.info('x"; DROP'), ERR);

t.group("liveness — valid ops still work after throws");
try { datetime.parse("garbage"); } catch {  }
t.eq("parse works after throw", datetime.parse("2024-01-15T00:00:00Z").offset, "+00:00");
try { timezone.convert("2024-01-15T12:00:00Z", "Bad/Zone"); } catch {  }
t.eq("convert works after throw", timezone.convert("2024-01-15T12:00:00Z", "UTC").offset, "+00:00");

t.done("ekko:datetime hardening");
