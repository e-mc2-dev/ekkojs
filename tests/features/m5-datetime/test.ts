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
const c: [string, boolean][] = [];

const now = datetime.now();
c.push(["now has iso", typeof now.iso === "string" && now.iso.length > 10]);
c.push(["now has epoch", typeof now.epoch === "number" && now.epoch > 0]);

const utc = datetime.nowUtc();
c.push(["nowUtc offset +00:00", utc.offset === "+00:00"]);

const ep = datetime.epoch();
c.push(["epoch number", typeof ep === "number" && ep > 1700000000000]);

const from = datetime.fromEpoch(0);
c.push(["fromEpoch 0 is 1970", from.iso.startsWith("1970")]);

const parsed = datetime.parse("2026-05-02T14:30:00Z");
c.push(["parse iso", parsed.iso.includes("2026-05-02")]);

const fmt = datetime.format(parsed, "yyyy-MM-dd");
c.push(["format", fmt === "2026-05-02"]);

const added = datetime.add(parsed, { days: 1 });
c.push(["add day", added.iso.includes("2026-05-03")]);

const d = datetime.diff(added, parsed);
c.push(["diff days", d.days === 1]);

const zones = timezone.list();
c.push(["tz list array", Array.isArray(zones) && zones.length > 10]);

const conv = timezone.convert(utc, "America/New_York");
c.push(["tz convert has zone", conv.zone === "America/New_York"]);

const info = timezone.info("Europe/London");
c.push(["tz info id", info.id === "Europe/London"]);

let p = 0, f = 0;
for (const [n, ok] of c) {
  if (ok) { p++; console.log("  PASS:", n); }
  else { f++; console.log("  FAIL:", n); }
}
console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
