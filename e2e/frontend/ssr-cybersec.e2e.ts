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
import { asserter } from "../_harness.ts";

const t = asserter();
const h = (type: any, props: any) => ({ type, props });
function dataStr(shell: string): string {
  const open = '<script id="__EKKO_DATA__" type="application/json">';
  const i = shell.indexOf(open); const start = i + open.length;
  return shell.slice(start, shell.indexOf("</script>", start));
}
function dataOf(shell: string): any { return JSON.parse(dataStr(shell)); }

t.group("hydration data — <script> breakout neutralized (was XSS)");
for (const payload of ["</script><script>alert(1)</script>", "</SCRIPT >", "<!--", "<script>x", "a</script>b"]) {
  const s = htmlShell({ data: { x: payload } });
  t.check("no raw </script> breakout for " + payload.slice(0, 12), !dataStr(s).toLowerCase().includes("</script>"));
  t.check("< is escaped in data", !dataStr(s).includes("<"));
  t.deep("data parses back to original " + payload.slice(0, 8), dataOf(s).x, payload);
}
t.check("ampersand escaped in data", !dataStr(htmlShell({ data: { x: "a&b" } })).includes("&") || dataStr(htmlShell({ data: { x: "a&b" } })).includes("\\u0026"));

t.group("lang attribute breakout neutralized");
{
  const s = htmlShell({ lang: '"><script>alert(1)</script>' });
  t.check("no lang breakout", !s.includes('lang=""><script>'));
  t.check("lang quote escaped", s.includes("&quot;") || s.includes("&#39;"));
}

t.group("asset URL attribute breakout neutralized");
{
  const s = htmlShell({ styles: ['x"><script>a</script>'], scripts: ['y"><script>b</script>'], modules: ['z"><script>c</script>'] });
  t.check("style url no breakout", !s.includes('href="x"><script>a</script>'));
  t.check("script url no breakout", !s.includes('src="y"><script>b</script>'));
  t.check("module url no breakout", !s.includes('src="z"><script>c</script>'));
}

t.group("renderToString XSS-safe");
t.check("text script escaped", renderToString(h("div", { children: "<script>alert(1)</script>" })).includes("&lt;script&gt;"));
t.check("attr breakout escaped", !renderToString(h("div", { title: '"><script>x</script>', children: "" })).includes('"><script>'));
t.check("title escaped in shell", htmlShell({ title: "<img src=x onerror=alert(1)>" }).includes("&lt;img"));

t.group("serializeProps rejects unsafe / non-serializable");
t.throws("function", () => serializeProps({ f: () => 1 }), /serialize|function/i);
t.throws("symbol", () => serializeProps({ s: Symbol("x") }), /serialize|Symbol/i);
t.throws("bigint", () => serializeProps({ n: 1n }), /serialize|BigInt/i);
t.throws("NaN", () => serializeProps({ n: NaN }), /serialize|NaN/i);
t.throws("Infinity", () => serializeProps({ n: Infinity }), /serialize|Infinity/i);
t.throws("RegExp", () => serializeProps({ r: /x/ }), /serialize|RegExp/i);
t.throws("Map", () => serializeProps({ m: new Map() }), /serialize|Map/i);
t.throws("Set", () => serializeProps({ s: new Set() }), /serialize|Set/i);
t.throws("circular", () => { const c: any = {}; c.s = c; serializeProps(c); }, /circular/i);
t.throws("Invalid Date", () => serializeProps({ d: new Date("bad") }), /serialize|Date/i);

t.done("ekko:ssr cybersec");
