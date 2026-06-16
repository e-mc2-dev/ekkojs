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
import { asserter } from "../_harness.ts";

const t = asserter();
const noBom = (s: string) => s.replace(/^﻿/, "");

t.group("unicode");
t.check("unicode selector", noBom(compileSass('.café { color: red; }')).includes(".café"));
t.check("unicode content preserved", noBom(compileSass('.x { content: "日本😀"; }')).includes("日本😀"));
t.check("emoji in content via transform", transform('.x{content:"🎉"}').code.includes("🎉"));

t.group("determinism / idempotency");
t.eq("transform deterministic", transform(".a{color:red;font-weight:bold}").code, transform(".a{color:red;font-weight:bold}").code);
t.eq("minify idempotent", minify(minify(".a { color: red; }")), minify(".a { color: red; }"));
t.eq("compileSass deterministic", noBom(compileSass(".a{color:red}")), noBom(compileSass(".a{color:red}")));
t.eq("cssModules code deterministic", cssModules(".a{color:red}", "f.css").code, cssModules(".a{color:red}", "f.css").code);

t.group("CSS features preserved");
t.check("custom property --var", minify(":root{--c:red}.a{color:var(--c)}").includes("--c"));
t.check("media query", minify("@media (min-width:600px){.a{color:red}}").includes("@media"));
t.check("keyframes", minify("@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}").includes("@keyframes"));
t.check("multiple selectors", minify(".a,.b,.c{color:red}").includes(".a,.b,.c"));
t.check("pseudo + attribute selectors", minify('a[href^="http"]:hover{color:red}').includes(":hover"));
t.check("calc preserved", minify(".a{width:calc(100% - 20px)}").includes("calc("));

t.group("sass features");
t.check("sass @each loop", noBom(compileSass('@each $c in red, blue { .#{$c} { color: $c; } }')).includes(".red"));
t.check("sass @if", noBom(compileSass('@if true { .a { color: red; } }')).includes("color:red"));
t.check("sass nested media", noBom(compileSass('.a { @media (min-width: 600px) { color: red; } }')).includes("@media"));
t.check("sass interpolation", noBom(compileSass('$n: btn;\n.#{$n} { color: red; }')).includes(".btn"));
t.eq("scss vs sass equivalent", noBom(compileSass(".a { color: red; }", "scss")), noBom(compileSass(".a\n  color: red", "sass")));

t.group("large / edge");
t.check("long selector", minify(".a .b .c .d .e .f > .g + .h ~ .i{color:red}").length > 0);
t.check("many declarations", (() => { let d = ""; for (let i = 0; i < 200; i++) d += `prop${i}:${i}px;`; return minify(".a{" + d + "}").length > 0; })());
t.eq("whitespace-only input", minify("   \n\t  "), "");

t.done("ekko:ssr/css recheck");
