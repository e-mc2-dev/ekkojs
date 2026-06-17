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
  const i = shell.indexOf(open); if (i < 0) return undefined;
  const start = i + open.length; const end = shell.indexOf("</script>", start);
  return JSON.parse(shell.slice(start, end));
}

t.group("escapeHtml");
t.eq("&", escapeHtml("a&b"), "a&amp;b");
t.eq("<", escapeHtml("a<b"), "a&lt;b");
t.eq(">", escapeHtml("a>b"), "a&gt;b");
t.eq('"', escapeHtml('a"b'), "a&quot;b");
t.eq("'", escapeHtml("a'b"), "a&#39;b");
t.eq("safe text unchanged", escapeHtml("hello world"), "hello world");
t.eq("empty", escapeHtml(""), "");

t.group("renderToString");
t.eq("text escaped", renderToString(h("div", { children: "<b>" })), "<div>&lt;b&gt;</div>");
t.eq("number", renderToString(42 as any), "42");
t.eq("null/false → empty", renderToString(null as any) + renderToString(false as any), "");
t.eq("className → class", renderToString(h("div", { className: "x", children: "" })), '<div class="x"></div>');
t.eq("htmlFor → for", renderToString(h("label", { htmlFor: "id", children: "" })), '<label for="id"></label>');
t.eq("attr escaped", renderToString(h("a", { href: '"x', children: "" })), '<a href="&quot;x"></a>');
t.eq("boolean true attr", renderToString(h("input", { disabled: true })), "<input disabled />");
t.eq("boolean false attr omitted", renderToString(h("input", { disabled: false })), "<input />");
t.eq("void self-close", renderToString(h("br", {})), "<br />");
t.eq("nested children", renderToString(h("ul", { children: [h("li", { children: "a" }), h("li", { children: "b" })] })), "<ul><li>a</li><li>b</li></ul>");
t.eq("style object → css", renderToString(h("div", { style: { fontSize: "12px", color: "red" }, children: "" })), '<div style="font-size:12px;color:red;"></div>');
t.eq("function component", renderToString(h(((p: any) => h("span", { children: p.x })), { x: "hi" })), "<span>hi</span>");

t.group("serializeProps");
t.deep("plain object", serializeProps({ a: 1, b: "x", c: true, d: null }), { a: 1, b: "x", c: true, d: null });
t.deep("nested + array", serializeProps({ a: [1, { b: 2 }] }), { a: [1, { b: 2 }] });
t.eq("Date → ISO", serializeProps({ d: new Date(0) }).d, "1970-01-01T00:00:00.000Z");
t.deep("drops undefined", serializeProps({ a: 1, b: undefined }), { a: 1 });
t.eq("string passthrough", serializeProps("hi"), "hi");

t.group("htmlShell");
{
  const s = htmlShell({ title: "T", body: "<p>hi</p>", data: { user: "alice", n: 5 } });
  t.check("doctype", s.startsWith("<!DOCTYPE html>"));
  t.check("title", s.includes("<title>T</title>"));
  t.check("body in __ekko", s.includes('<div id="__ekko"><p>hi</p></div>'));
  t.deep("data parses back", dataOf(s), { user: "alice", n: 5 });
}
{
  const s = htmlShell({ scripts: ["/a.js"], modules: ["/m.js"], styles: ["/s.css"] });
  t.check("script", s.includes('<script src="/a.js"></script>'));
  t.check("module", s.includes('<script type="module" src="/m.js"></script>'));
  t.check("style", s.includes('<link rel="stylesheet" href="/s.css">'));
}
t.check("no data script when data undefined", !htmlShell({}).includes("__EKKO_DATA__"));
t.check("defaults produce valid doc", htmlShell({}).includes("<title>EkkoJS App</title>"));

t.done("ekko:ssr covered");
