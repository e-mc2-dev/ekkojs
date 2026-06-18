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
const noBom = (s: string) => s.replace(/^﻿/, "");

t.group("compileSass");
t.check("variables", noBom(compileSass("$c: red;\n.btn { color: $c; }")).includes("color:red"));
t.check("nesting → descendant", noBom(compileSass(".p { .c { color: blue; } }")).includes(".p .c"));
t.check("& parent selector", noBom(compileSass(".btn { &:hover { color: red; } }")).includes(".btn:hover"));
t.check("mixin/@include", noBom(compileSass("@mixin f { display: flex; }\n.c { @include f; }")).includes("display:flex"));
t.eq("math", noBom(compileSass(".x { width: 10px * 2 + 5px; }")), ".x{width:25px}");
t.check("indented sass syntax", noBom(compileSass(".btn\n  color: red", "sass")).includes("color:red"));
t.check("compressed output (no spaces around {)", !noBom(compileSass(".a { color: red; }")).includes("{ "));

t.group("transform");
t.eq("minify default true", transform(".btn { color:  red;  }").code, ".btn{color:red}");
t.check("minify false pretty", transform(".btn { color: red; }", { minify: false }).code.includes("\n"));
t.type("returns {code}", transform(".a{color:red}").code, "string");
t.eq("idempotent on minified", transform(transform(".a { color: red }").code).code, ".a{color:red}");

t.group("cssModules");
{
  const r = cssModules(".container { color: red; }\n.title { font-size: 2rem; }", "card.module.css");
  t.type("code string", r.code, "string");
  t.type("classes object", r.classes, "object");
  t.check("container scoped", typeof r.classes.container === "string" && r.classes.container.includes("container"));
  t.check("title scoped", typeof r.classes.title === "string" && r.classes.title.includes("title"));
  t.check("scoped name in code", r.code.includes(r.classes.container));
}
t.eq("determinism same input+file", cssModules(".x{color:red}", "f.css").classes.x, cssModules(".x{color:red}", "f.css").classes.x);
t.ne("cross-filename differs", cssModules(".x{color:red}", "a.css").classes.x, cssModules(".x{color:red}", "b.css").classes.x);

t.group("minify");
t.eq("strips comments + whitespace", minify("/* c */ .btn {  color: red;  }"), ".btn{color:red}");
t.check("bold → 700", minify(".x{font-weight:bold}").includes("700"));
t.check("preserves multiple decls", (() => { const m = minify(".x{color:red;font-weight:bold}"); return m.includes("red") && m.includes("700"); })());
t.eq("round-trip compileSass→minify", minify(noBom(compileSass("$c:red;\n.b{color:$c}"))), ".b{color:red}");

t.group("edge: empty");
t.eq("empty sass", noBom(compileSass("")), "");
t.eq("empty transform", transform("").code, "");
t.eq("empty minify", minify(""), "");

t.done("ekko:ssr/css covered");
