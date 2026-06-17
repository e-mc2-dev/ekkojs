// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { Regex } from "ekko:text/regex";
const c: [string, boolean][] = [];

const re = Regex("(\\w+)@(\\w+\\.\\w+)", "i");
c.push(["test match", re.test("alice@example.com") === true]);
c.push(["test no match", re.test("not an email") === false]);

const m = re.match("Contact alice@example.com for info");
c.push(["match value", m !== null && m.value === "alice@example.com"]);
c.push(["match index", m.index === 8]);
c.push(["match groups", m.groups[0] === "alice" && m.groups[1] === "example.com"]);

const all = re.matchAll("alice@a.com and bob@b.com");
c.push(["matchAll count", all.length === 2]);
c.push(["matchAll first", all[0].value === "alice@a.com"]);
c.push(["matchAll second", all[1].value === "bob@b.com"]);

const replaced = re.replace("alice@a.com", "$1 at $2");
c.push(["replace", replaced === "alice at a.com"]);

const splitter = Regex("[,;\\s]+");
const parts = splitter.split("a, b; c  d");
c.push(["split", parts.length === 4 && parts[0] === "a" && parts[3] === "d"]);
splitter.dispose();

const dateRe = Regex("(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})");
const dm = dateRe.match("2026-05-02");
c.push(["named groups", dm.groups.year === "2026" && dm.groups.month === "05" && dm.groups.day === "02"]);
dateRe.dispose();

let threw = false;
try { Regex("[invalid"); } catch (e) { threw = true; }
c.push(["invalid pattern throws", threw === true]);

const noMatch = re.match("nothing here");
c.push(["no match returns null", noMatch === null]);

re.dispose();

let p = 0, f = 0;
for (const [n, ok] of c) {
  if (ok) { p++; console.log("  PASS:", n); }
  else { f++; console.log("  FAIL:", n); }
}
console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
