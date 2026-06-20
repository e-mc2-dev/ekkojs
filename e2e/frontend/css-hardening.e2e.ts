// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { compileSass, transform, cssModules, minify } from "ekko:ssr/css";
import { asserter } from "../_harness";

const t = asserter();

t.group("malformed Sass throws cleanly (no crash)");
t.throws("unclosed brace", () => compileSass(".btn { color: red"), /.+/);
t.throws("garbage", () => compileSass("@@@ not sass {{{"), /.+/);
t.throws("bad @mixin", () => compileSass("@include nonexistent;"), /.+/);

t.group("malformed CSS throws cleanly");
t.throws("transform dangling combinator", () => transform("this is not css }{"), /.+/);
t.throws("cssModules broken", () => cssModules("}}} broken", "x.css"), /.+/);

t.group("liveness after a throw");
try { compileSass(".x {"); } catch {  }
t.eq("compileSass works after throw", compileSass(".a{color:red}").replace(/^﻿/, ""), ".a{color:red}");

t.group("deep nesting is GUARDED (was stack-overflow crash)");
const deep = (n: number) => ".n{".repeat(n) + "color:red" + "}".repeat(n);
t.throws("compileSass 1000-deep throws (not crash)", () => compileSass(deep(1000)), /nesting|depth|denial|error/i);
t.throws("transform 1000-deep throws", () => transform(deep(1000)), /nesting|depth|denial|error/i);
t.throws("minify 1000-deep throws", () => minify(deep(1000)), /nesting|depth|denial|error/i);
t.throws("cssModules 1000-deep throws", () => cssModules(deep(1000), "x.css"), /nesting|depth|denial|error/i);
t.notThrows("moderate 100-deep still compiles (under cap)", () => compileSass(deep(100)));

t.check("works after deep-nesting reject", minify(".z{color:blue}").startsWith(".z{color:"));

t.group("large flat input completes (no DoS for non-nested)");
t.check("50k flat rules minify", (() => { let s = ""; for (let i = 0; i < 50000; i++) s += `.c${i}{color:red}`; return minify(s).length > 0; })());

t.group("braces inside strings/comments not miscounted by the guard");
t.notThrows("many { in content string is fine", () => compileSass('.x { content: "' + "{".repeat(500) + '"; }'));
t.notThrows("many { in a comment is fine", () => minify("/*" + "{".repeat(500) + "*/ .a{color:red}"));

t.group("backend (grass/lightningcss) panics CONTAINED — never crash the process (W1.1 fuzz)");
{

  
  const META = "{}();:,.\"'/\\<>%&#@$*+-=[]!?|~^ \t\n0123456789abcXYZ";
  let seed = 0x9e3779b9 >>> 0;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed; };
  const gen = (n: number) => { let s = ""; for (let i = 0; i < n; i++) s += META[rnd() % META.length]; return s; };
  let survived = 0;
  for (let i = 0; i < 400; i++) {
    const inp = gen(64 + (rnd() % 1024));
    try { compileSass(inp); } catch {  }
    try { transform(inp); } catch {}
    try { cssModules(inp, "f.css"); } catch {}
    survived++;
  }
  t.eq("400 fuzzy inputs across 3 entry points, none crashed", survived, 400);
  t.check("compileSass still works after the fuzz batch", compileSass(".ok{color:red}").includes(".ok"));
}

t.done("ekko:ssr/css hardening");
