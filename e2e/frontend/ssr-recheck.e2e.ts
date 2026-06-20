// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


import { renderToString, escapeHtml, htmlShell, serializeProps } from "ekko:ssr";
import { asserter } from "../_harness";

const t = asserter();
const h = (type: any, props: any) => ({ type, props });
function dataOf(shell: string): any {
  const open = '<script id="__EKKO_DATA__" type="application/json">';
  const i = shell.indexOf(open); const start = i + open.length;
  return JSON.parse(shell.slice(start, shell.indexOf("</script>", start)));
}

t.group("escapeHtml ordering + unicode");
t.eq("ampersand-first (no double-escape)", escapeHtml("<&>"), "&lt;&amp;&gt;");
t.eq("already-entity not re-escaped wrongly", escapeHtml("&amp;"), "&amp;amp;");
t.eq("unicode passthrough", escapeHtml("café 😀 日本"), "café 😀 日本");
t.eq("all five together", escapeHtml(`<a b="c" d='e'>&`), "&lt;a b=&quot;c&quot; d=&#39;e&#39;&gt;&amp;");
t.eq("large string", escapeHtml("<".repeat(10000)).length, "&lt;".length * 10000);

t.group("renderToString edges");
t.eq("deep nesting", renderToString(h("a", { children: h("b", { children: h("i", { children: "x" }) }) })), "<a><b><i>x</i></b></a>");
t.eq("mixed array children", renderToString(h("div", { children: ["a", h("b", { children: "c" }), 1] })), "<div>a<b>c</b>1</div>");
t.eq("key/ref dropped", renderToString(h("div", { key: "k", ref: "r", id: "x", children: "" })), '<div id="x"></div>');
t.eq("__raw passthrough", renderToString({ __rawHtml: true, html: "<b>raw</b>" } as any), "<b>raw</b>");
t.eq("empty children", renderToString(h("div", { children: "" })), "<div></div>");

t.group("serializeProps edges");
t.deep("deep nesting", serializeProps({ a: { b: { c: [1, 2, { d: "x" }] } } }), { a: { b: { c: [1, 2, { d: "x" }] } } });
t.deep("big array", serializeProps(Array.from({ length: 100 }, (_, i) => i)), Array.from({ length: 100 }, (_, i) => i));
t.deep("nested undefined dropped", serializeProps({ a: { b: undefined, c: 1 } }), { a: { c: 1 } });
t.eq("boolean values", JSON.stringify(serializeProps({ t: true, f: false })), '{"t":true,"f":false}');
t.eq("zero and negative", JSON.stringify(serializeProps({ z: 0, n: -5 })), '{"z":0,"n":-5}');

t.group("htmlShell edges");
t.check("multiple styles order preserved", htmlShell({ styles: ["/a.css", "/b.css"] }).indexOf("/a.css") < htmlShell({ styles: ["/a.css", "/b.css"] }).indexOf("/b.css"));
t.deep("data with unicode round-trips", dataOf(htmlShell({ data: { msg: "café 😀 日本", arr: [1, "two"] } })), { msg: "café 😀 日本", arr: [1, "two"] });
t.deep("data null round-trips", dataOf(htmlShell({ data: { a: null, b: 0, c: false } })), { a: null, b: 0, c: false });
t.check("head inserted raw", htmlShell({ head: "<meta name='x'>" }).includes("<meta name='x'>"));
t.check("inlineStyles raw", htmlShell({ inlineStyles: "<style>.a{}</style>" }).includes("<style>.a{}</style>"));
t.check("lang default en", htmlShell({}).includes('lang="en"'));
t.check("custom lang escaped + present", htmlShell({ lang: "fr-CA" }).includes('lang="fr-CA"'));

t.done("ekko:ssr recheck");
