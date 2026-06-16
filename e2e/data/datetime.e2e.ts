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
import { asserter } from "../_harness.ts";

const t = asserter();

t.group("now / epoch (shape + monotonicity only)");
const n = datetime.now();
t.type("now.iso string", n.iso, "string");
t.type("now.epoch number", n.epoch, "number");
t.type("now.offset string", n.offset, "string");
t.type("nowUtc.iso string", datetime.nowUtc().iso, "string");
t.type("epoch() is number", datetime.epoch(), "number");
t.gte("epoch() monotonic", datetime.epoch(), n.epoch - 1000);
t.gt("epoch() plausible (after 2020)", datetime.epoch(), 1577836800000);

t.group("parse — fixed explicit-TZ inputs");
t.eq("parse Z → epoch", datetime.parse("2024-01-15T10:30:00Z").epoch, 1705314600000);
t.eq("parse Z → offset", datetime.parse("2024-01-15T10:30:00Z").offset, "+00:00");
t.eq("parse +05:00 → epoch", datetime.parse("2024-01-15T10:30:00+05:00").epoch, 1705296600000);
t.eq("parse +05:00 → offset", datetime.parse("2024-01-15T10:30:00+05:00").offset, "+05:00");
t.eq("parse fractional → epoch", datetime.parse("2024-01-15T10:30:00.123Z").epoch, 1705314600123);
t.eq("parseExact dd/MM/yyyy epoch matches", datetime.parse("15/01/2024", "dd/MM/yyyy").iso.slice(0, 10), "2024-01-15");

t.group("format");
t.eq("format yyyy-MM-dd", datetime.format("2024-01-15T10:30:00Z", "yyyy-MM-dd"), "2024-01-15");
t.eq("format HH:mm:ss", datetime.format("2024-01-15T10:30:45Z", "HH:mm:ss"), "10:30:45");
t.eq("format yyyy", datetime.format("2024-01-15T10:30:00Z", "yyyy"), "2024");
t.eq("format accepts {iso} object", datetime.format(datetime.parse("2024-06-15T00:00:00Z"), "yyyy-MM-dd"), "2024-06-15");

t.group("add (days/hours/minutes/seconds/milliseconds)");
t.eq("add 1 day", datetime.add("2024-01-15T00:00:00Z", { days: 1 }).epoch, datetime.parse("2024-01-16T00:00:00Z").epoch);
t.eq("add -5 hours", datetime.add("2024-01-15T12:00:00Z", { hours: -5 }).epoch, datetime.parse("2024-01-15T07:00:00Z").epoch);
t.eq("add combined", datetime.add("2024-01-15T00:00:00Z", { days: 1, hours: 2, minutes: 30 }).epoch, datetime.parse("2024-01-16T02:30:00Z").epoch);
t.eq("add 500ms", datetime.add("2024-01-15T00:00:00Z", { milliseconds: 500 }).epoch, 1705276800500);

t.group("diff");
t.deep("diff 1 day", datetime.diff("2024-01-16T00:00:00Z", "2024-01-15T00:00:00Z"), { milliseconds: 86400000, seconds: 86400, minutes: 1440, hours: 24, days: 1 });
t.eq("diff negative (a<b)", datetime.diff("2024-01-15T00:00:00Z", "2024-01-16T00:00:00Z").milliseconds, -86400000);
t.eq("diff hours", datetime.diff("2024-01-15T05:00:00Z", "2024-01-15T00:00:00Z").hours, 5);

t.group("epoch / fromEpoch");
t.eq("fromEpoch(0) is 1970", datetime.fromEpoch(0).iso.slice(0, 4), "1970");
t.eq("fromEpoch(0).epoch", datetime.fromEpoch(0).epoch, 0);
t.eq("epoch round-trip", datetime.fromEpoch(datetime.parse("2024-01-15T10:30:00Z").epoch).epoch, 1705314600000);
t.eq("fromEpoch large", datetime.fromEpoch(1705314600123).epoch, 1705314600123);

t.group("timezone — IANA cross-platform");
t.gt("list() non-empty", timezone.list().length, 10);
t.check("list() includes Etc/UTC (canonical IANA)", timezone.list().includes("Etc/UTC"));
t.check("list() includes IANA America/New_York", timezone.list().includes("America/New_York"));
t.notThrows("convert('UTC') still works", () => timezone.convert("2024-01-15T12:00:00Z", "UTC"));
t.eq("convert UTC offset", timezone.convert("2024-01-15T12:00:00Z", "UTC").offset, "+00:00");
t.eq("convert America/New_York (winter EST −05:00)", timezone.convert("2024-01-15T12:00:00Z", "America/New_York").offset, "-05:00");
t.eq("convert Asia/Tokyo (+09:00)", timezone.convert("2024-01-15T12:00:00Z", "Asia/Tokyo").offset, "+09:00");
t.eq("convert Europe/Paris (summer CEST +02:00)", timezone.convert("2024-07-15T12:00:00Z", "Europe/Paris").offset, "+02:00");
t.eq("convert preserves instant (epoch unchanged)", timezone.convert("2024-01-15T12:00:00Z", "Asia/Tokyo").epoch, 1705320000000);
{
  const info = timezone.info("America/New_York");
  t.eq("info id", info.id, "America/New_York");
  t.type("info displayName", info.displayName, "string");
  t.type("info utcOffset", info.utcOffset, "string");
  t.type("info isDst", info.isDst, "boolean");
}

t.done("ekko:datetime covered");
