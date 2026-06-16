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
import { asserter } from "../_harness.ts";

const t = asserter();
const ERR = /invalid|pattern|error|parse|I\/O/i;
const TIMEOUT = /timeout|time|error|I\/O|invalid/i;

t.group("invalid patterns throw cleanly (no crash)");
t.throws("unbalanced (", () => Regex("(abc"), ERR);
t.throws("unbalanced )", () => Regex("abc)"), ERR);
t.throws("reversed class [z-a]", () => Regex("[z-a]"), ERR);
t.throws("unterminated class [abc", () => Regex("[abc"), ERR);
t.throws("dangling quantifier *", () => Regex("*foo"), ERR);
t.throws("bad named group (?<", () => Regex("(?<"), ERR);
t.throws("trailing backslash", () => Regex("\\"), ERR);

t.group("ReDoS bounded by 2s match timeout (was infinite hang)");
const REDOS = "(a+)+$";
const EVIL = "a".repeat(50) + "!";
t.throws("test() on catastrophic input throws (not hang)", () => Regex(REDOS).test(EVIL), TIMEOUT);
t.throws("match() on catastrophic input throws", () => Regex(REDOS).match(EVIL), TIMEOUT);
t.throws("matchAll() on catastrophic input throws", () => Regex(REDOS).matchAll(EVIL), TIMEOUT);
t.throws("replace() on catastrophic input throws", () => Regex(REDOS).replace(EVIL, "x"), TIMEOUT);

t.group("liveness — normal regex works after a timeout / a throw");
try { Regex(REDOS).test(EVIL); } catch {  }
t.eq("normal test works after timeout", Regex("^\\d+$").test("123"), true);
try { Regex("(abc"); } catch {  }
t.eq("normal match works after invalid-pattern throw", Regex("x").match("axb").value, "x");

t.group("large linear input completes (no DoS for non-catastrophic patterns)");
const big = "a".repeat(1024 * 1024) + "b";
t.eq("1MB linear test", Regex("ab$").test(big.slice(0, 1024 * 1024) + "ab"), true);
t.eq("1MB matchAll count", Regex("a", "g").matchAll("a".repeat(100000)).length, 100000);

t.group("dispose lifecycle");
t.notThrows("double dispose no crash", () => { const r = Regex("a"); r.dispose(); r.dispose(); });
t.throws("use after dispose throws", () => { const r = Regex("a"); r.dispose(); r.test("a"); }, /.+/);

t.done("ekko:text/regex hardening");
