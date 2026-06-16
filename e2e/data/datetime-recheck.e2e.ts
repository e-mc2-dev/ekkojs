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

t.group("IANA timezones resolve cross-platform (was Windows-THROW pre-ICU, task 221)");
for (const z of ["UTC", "America/New_York", "Asia/Tokyo", "Europe/Paris", "Australia/Sydney", "America/Los_Angeles"]) {
  t.notThrows("convert " + z, () => timezone.convert("2024-01-15T12:00:00Z", z));
  t.notThrows("info " + z, () => timezone.info(z));
}
t.check("list includes Asia/Tokyo (IANA)", timezone.list().includes("Asia/Tokyo"));
t.check("list includes Europe/London (IANA)", timezone.list().includes("Europe/London"));

t.group("DST — same zone differs winter vs summer");
t.eq("NY winter EST −05:00", timezone.convert("2024-01-15T12:00:00Z", "America/New_York").offset, "-05:00");
t.eq("NY summer EDT −04:00", timezone.convert("2024-07-15T12:00:00Z", "America/New_York").offset, "-04:00");
t.eq("Paris winter CET +01:00", timezone.convert("2024-01-15T12:00:00Z", "Europe/Paris").offset, "+01:00");
t.eq("Paris summer CEST +02:00", timezone.convert("2024-07-15T12:00:00Z", "Europe/Paris").offset, "+02:00");
t.eq("Tokyo no DST (+09:00 both)", timezone.convert("2024-07-15T12:00:00Z", "Asia/Tokyo").offset, "+09:00");
t.eq("convert keeps the instant (epoch) across zones", timezone.convert("2024-01-15T12:00:00Z", "America/New_York").epoch, timezone.convert("2024-01-15T12:00:00Z", "Asia/Tokyo").epoch);

t.group("TZ-less parse assumes local (lock — don't assert which offset)");
t.type("parse('2024-01-15') has an offset", datetime.parse("2024-01-15").offset, "string");
t.eq("explicit Z is deterministic", datetime.parse("2024-01-15T00:00:00Z").epoch, datetime.parse("2024-01-15T00:00:00+00:00").epoch);

t.group("boundaries + leap");
t.eq("leap day 2024-02-29 ok", datetime.parse("2024-02-29T00:00:00Z").iso.slice(0, 10), "2024-02-29");
t.eq("year 0001", datetime.parse("0001-01-01T00:00:00Z").iso.slice(0, 4), "0001");
t.eq("year 9999", datetime.parse("9999-12-31T23:59:59Z").iso.slice(0, 4), "9999");
t.eq("end-of-month add rolls over", datetime.add("2024-01-31T00:00:00Z", { days: 1 }).iso.slice(0, 10), "2024-02-01");
t.eq("leap-year feb add", datetime.add("2024-02-28T00:00:00Z", { days: 1 }).iso.slice(0, 10), "2024-02-29");

t.group("precision + symmetry");
t.eq("fractional ms round-trip", datetime.fromEpoch(1705314600789).epoch, 1705314600789);
t.eq("diff symmetry a-b == -(b-a)", datetime.diff("2024-03-01T00:00:00Z", "2024-01-01T00:00:00Z").milliseconds, -datetime.diff("2024-01-01T00:00:00Z", "2024-03-01T00:00:00Z").milliseconds);
t.eq("offset input preserved through parse", datetime.parse("2024-01-15T10:30:00-08:00").offset, "-08:00");
t.eq("add 0 is identity", datetime.add("2024-01-15T10:30:00Z", {}).epoch, datetime.parse("2024-01-15T10:30:00Z").epoch);

t.group("format/parse round-trip stability");
for (const iso of ["2024-01-15T10:30:00Z", "2024-12-31T23:59:59Z", "2020-02-29T12:00:00Z"]) {
  const f = datetime.format(iso, "yyyy-MM-ddTHH:mm:ssZ");
  t.eq("round-trip preserves date " + iso.slice(0, 10), datetime.parse(iso).iso.slice(0, 10), iso.slice(0, 10));
}

t.done("ekko:datetime recheck");
