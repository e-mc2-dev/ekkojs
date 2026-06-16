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

t.group("works under default-deny");
t.notThrows("Regex with no --allow", () => Regex("a").test("a"));

t.group("test");
t.eq("anchored digits true", Regex("^\\d{4}$").test("2024"), true);
t.eq("anchored digits false", Regex("^\\d{4}$").test("nope"), false);
t.eq("word boundary", Regex("\\bfoo\\b").test("a foo b"), true);
t.eq("alternation", Regex("cat|dog").test("a dog"), true);
t.eq("char class", Regex("[a-z]+").test("Hello"), true);
t.eq("negated class no match", Regex("^[^0-9]+$").test("ab1"), false);
t.eq("quantifier ?", Regex("colou?r").test("color"), true);

t.group("flags i / m / s");
t.eq("i case-insensitive", Regex("hello", "i").test("HELLO"), true);
t.eq("without i", Regex("hello").test("HELLO"), false);
t.eq("m multiline ^", Regex("^bar$", "m").test("foo\nbar\nbaz"), true);
t.eq("without m ^bar$", Regex("^bar$").test("foo\nbar"), false);
t.eq("s dot matches newline", Regex("a.b", "s").test("a\nb"), true);
t.eq("without s dot-newline", Regex("a.b").test("a\nb"), false);

t.group("match");
{
  const m = Regex("world").match("hello world");
  t.eq("match value", m.value, "world");
  t.eq("match index", m.index, 6);
}
t.eq("no match → null", Regex("zzz").match("abc"), null);
{
  const m = Regex("(?<y>\\d{4})-(?<mo>\\d{2})-(?<d>\\d{2})").match("on 2024-01-15 ok");
  t.eq("named match value", m.value, "2024-01-15");
  t.eq("named index", m.index, 3);
  t.eq("group y", m.groups.y, "2024");
  t.eq("group mo", m.groups.mo, "01");
  t.eq("group d", m.groups.d, "15");
}
{
  const m = Regex("(\\d)(\\w)").match("1a");
  t.deep("unnamed groups array", m.groups, ["1", "a"]);
}

t.group("matchAll");
t.eq("matchAll count", Regex("\\d", "g").matchAll("a1b2c3").length, 3);
t.deep("matchAll values", Regex("\\w+", "g").matchAll("hi there you").map((m: any) => m.value), ["hi", "there", "you"]);
t.deep("matchAll indices", Regex("a", "g").matchAll("banana").map((m: any) => m.index), [1, 3, 5]);
t.eq("matchAll empty → []", Regex("z", "g").matchAll("abc").length, 0);

t.group("replace");
t.eq("replace literal global", Regex("\\d", "g").replace("a1b2", "*"), "a*b*");
t.eq("replace first (still global in .NET)", Regex("o").replace("foo boo", "0"), "f00 b00");
t.eq("replace $1$2 swap", Regex("(\\w)(\\w)").replace("ab", "$2$1"), "ba");
t.eq("replace ${name}", Regex("(?<x>\\w)").replace("a", "[${x}]"), "[a]");
t.eq("replace $$ literal", Regex("a").replace("a", "$$"), "$");
t.eq("replace $& whole", Regex("\\d+").replace("x42", "<$&>"), "x<42>");

t.group("split");
t.deep("split delimiters", Regex("[,;\\s]+").split("a, b; c  d"), ["a", "b", "c", "d"]);
t.deep("split single char", Regex(",").split("a,b,c"), ["a", "b", "c"]);
t.deep("split capturing includes sep (.NET)", Regex("(,)").split("a,b"), ["a", ",", "b"]);
t.eq("split no match → whole", Regex("z").split("abc").length, 1);

t.group("dispose");
t.notThrows("dispose ok", () => Regex("a").dispose());
t.throws("use after dispose throws", () => { const r = Regex("a"); r.dispose(); r.test("a"); }, /.+/);

t.done("ekko:text/regex covered");
