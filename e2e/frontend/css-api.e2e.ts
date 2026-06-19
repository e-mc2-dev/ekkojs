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

t.group("compileSass — grass SCSS");
t.check("scss variable compiles", /color:red/.test(compileSass("$c:red;.a{color:$c}")));
t.check("nesting flattens", /\.p \.c/.test(compileSass(".p{.c{x:1}}")));
t.check("mixin includes", /display:flex/.test(compileSass("@mixin f{display:flex}.c{@include f}")));
t.throws("bad @use errors (not crash)", () => { compileSass("@use 'nope';"); }, /./);

t.group("transform / minify — lightningcss");
t.check("minify shrinks", minify(".a {  color:  red;  }").length < ".a {  color:  red;  }".length);
t.check("transform minify:false keeps the rule", /\.a/.test((transform(".a{color:red}", { minify: false }) as any).code));
t.check("transform minify:true compresses", (transform(".a {  color: red }", { minify: true }) as any).code.length <= ".a {  color: red }".length);

t.group("cssModules — scoping + the new pattern option (309)");
{
  const r = cssModules(".box{color:red}", "x.module.css") as any;
  t.ok("returns a classes map", r.classes);
  t.ne("scoped name differs from the original", r.classes.box, "box");
  t.check("scoped code references the scoped class", r.code.includes(r.classes.box));
}
{
  const r = cssModules(".box{color:red}", "Card.module.css", { pattern: "[local]_[hash]" }) as any;
  t.check("custom pattern honored (starts with the local name)", /^box_/.test(r.classes.box));
}
{
  
  const a = (cssModules(".x{a:1}", "f.module.css", { pattern: "[hash]" }) as any).classes.x;
  const b = (cssModules(".x{a:1}", "f.module.css", { pattern: "[hash]" }) as any).classes.x;
  t.eq("deterministic scoped name across calls", a, b);
}
t.throws("invalid pattern errors cleanly (not crash)", () => { cssModules(".a{}", "f.module.css", { pattern: "[" }); }, /pattern|css/i);

t.group("DoS guard (recheck) — pathological input errors, never crashes");
t.throws("deep paren nesting → error", () => { compileSass("a{x:" + "(".repeat(2000) + ")".repeat(2000) + "}"); }, /nesting|denial|css/i);
t.throws("unclosed comment → error", () => { compileSass("/* never closed"); }, /comment|css/i);

t.done("ekko:ssr/css low-level API (309)");
