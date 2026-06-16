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

t.group("match.index is UTF-16 aligned (even for astral / non-ASCII)");
t.eq("emoji prefix: 😀😀X → 4", Regex("X").match("😀😀X").index, 4);
t.eq("emoji then ascii: 😀ab → b at 3", Regex("b").match("😀ab").index, 3);
t.eq("CJK prefix: 日本X → 2", Regex("X").match("日本X").index, 2);
t.eq("matches JS indexOf", Regex("X").match("a😀bX").index, "a😀bX".indexOf("X"));
t.eq("ascii index", Regex("z").match("abcz").index, 3);

t.group("named + unnamed group edges");
t.eq("group value with quote", Regex("(?<v>.+)").match('x"y').groups.v, 'x"y');
t.eq("group value with backslash", Regex("(?<v>.+)").match("a\\b").groups.v, "a\\b");
t.eq("group value with tab (control char escaping)", Regex("(?<v>.+)").match("a\tb").groups.v, "a\tb");
t.eq("group value with colon", Regex("(?<v>.+)").match("http://x:8080").groups.v, "http://x:8080");
{
  const m = Regex("(a)(b)?(c)").match("ac");   
  t.check("optional unmatched group → empty/omitted", m.groups[0] === "a" && (m.groups[1] === "" || m.groups[1] === undefined));
}
t.deep("nested groups order", Regex("((\\d)(\\w))").match("1a").groups, ["1a", "1", "a"]);

t.group(".NET semantics (locked)");
t.deep("split includes captured separators", Regex("(\\d)").split("a1b2c"), ["a", "1", "b", "2", "c"]);
t.eq("matchAll always-global (no g flag)", Regex("\\d").matchAll("a1b2c3").length, 3);
t.eq("replace always-global (no g flag)", Regex("\\d").replace("a1b2c3", "*"), "a*b*c*");
t.eq("replace ${name} (.NET syntax)", Regex("(?<n>\\w+)").replace("hi", "<${n}>"), "<hi>");
t.eq("replace $$ → literal $", Regex("x").replace("x", "$$"), "$");
t.eq("replace $& whole match", Regex("\\d+").replace("a42", "[$&]"), "a[42]");

t.group("x flag — IgnorePatternWhitespace (task 219 fix)");
t.eq("x ignores literal spaces in pattern", Regex("\\d \\d", "x").test("12"), true);
t.eq("x ignores newlines/indent in pattern", Regex("\\d+\n  \\w", "x").test("12a"), true);
t.eq("without x, space is literal", Regex("\\d \\d").test("12"), false);

t.group("empties + edge");
t.deep("empty pattern split → chars+ends", Regex("").split("abc"), ["", "a", "b", "c", ""]);
t.eq("empty input a* match", Regex("a*").match("").value, "");
t.eq("empty input a* index", Regex("a*").match("").index, 0);
t.eq("matchAll empty input → []", Regex("\\d", "g").matchAll("").length, 0);
t.eq("no-match match → null", Regex("zzz").match("abc"), null);

t.group("unicode + case-insensitivity + instance isolation");
t.eq("unicode literal", Regex("café").test("a café"), true);
t.eq("i flag unicode case", Regex("café", "i").test("A CAFÉ"), true);
t.eq("combining marks literal", Regex("é").test("é"), true);
{
  
  const rs = [];
  for (let i = 0; i < 50; i++) rs.push(Regex(String(i)));
  let ok = true;
  for (let i = 0; i < 50; i++) if (!rs[i].test("n" + i)) ok = false;
  for (const r of rs) r.dispose();
  t.check("50 independent Regex instances isolated", ok);
}
{
  const r = Regex("\\d+", "g");   
  t.eq("reuse #1", r.matchAll("a1b22").length, 2);
  t.eq("reuse #2", r.matchAll("3 4 5").length, 3);
  r.dispose();
}

t.done("ekko:text/regex recheck");
