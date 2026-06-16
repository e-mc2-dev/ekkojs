// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { scanRoutes, readManifest, resolvePageAssets, createStyleCollector, createApp } from "ekko:rune";
import { mkdir, writeText, remove, exists } from "ekko:fs";
import { asserter } from "../_harness.ts";

const t = asserter();
const ROOT = "e2e/_dbtmp/rune";
function rmrf(p: string) { try { if (exists(p)) remove(p); } catch {  } }
function setup() {
  rmrf(ROOT);
  for (const d of [ROOT, ROOT + "/pages", ROOT + "/pages/blog", ROOT + "/pages/(group)"]) mkdir(d);
  writeText(ROOT + "/pages/index.tsx", "export default()=>null");
  writeText(ROOT + "/pages/about.tsx", "export default()=>null");
  writeText(ROOT + "/pages/blog/[id].tsx", "export default()=>null");
  writeText(ROOT + "/pages/[...slug].tsx", "export default()=>null");
  writeText(ROOT + "/pages/(group)/g.tsx", "export default()=>null");
  writeText(ROOT + "/pages/layout.tsx", "export default()=>null");
  writeText(ROOT + "/pages/x.test.tsx", "test");
  writeText(ROOT + "/manifest.json", JSON.stringify({ hydrate: "hydrate.js", pages: { index: { file: "index.js", imports: ["chunk.js"] } }, styles: ["app.css"], chunks: [] }));
}
setup();

t.group("scanRoutes — route mapping");
{
  const routes = scanRoutes(ROOT + "/pages");
  const byPattern: Record<string, any> = {}; for (const r of routes) byPattern[r.pattern] = r;
  t.check("index → /", !!byPattern["/"]);
  t.check("about → /about", !!byPattern["/about"]);
  t.check("dynamic [id] → /blog/:id", !!byPattern["/blog/:id"]);
  t.check("dynamic flag set", byPattern["/blog/:id"] && byPattern["/blog/:id"].dynamic === true);
  t.check("catch-all [...slug] → *slug", routes.some((r: any) => r.pattern.includes("*slug") && r.catchAll));
  t.check("layout.tsx excluded (convention)", !routes.some((r: any) => r.file.endsWith("layout.tsx")));
  t.check(".test.tsx excluded", !routes.some((r: any) => r.file.indexOf(".test.") !== -1));
  t.check("route group (group) stripped from pattern", routes.some((r: any) => r.pattern === "/g"));
  t.check("static routes sort before dynamic", (() => { const sp = routes.filter((r: any) => !r.dynamic).map((r: any) => r.priority); const dp = routes.filter((r: any) => r.dynamic).map((r: any) => r.priority); return sp.every((s: number) => dp.every((d: number) => s <= d)); })());
}

t.group("readManifest");
{
  const m = readManifest(ROOT + "/manifest.json");
  t.eq("hydrate", m.hydrate, "hydrate.js");
  t.deep("styles", m.styles, ["app.css"]);
  t.check("pages.index", !!m.pages.index);
}
{
  const def = readManifest(ROOT + "/nonexistent.json");
  t.eq("missing → default hydrate null", def.hydrate, null);
  t.deep("missing → empty pages", def.pages, {});
  t.deep("missing → empty chunks", def.chunks, []);
}

t.group("resolvePageAssets (pure)");
{
  const manifest = { hydrate: "hyd.js", pages: { index: { file: "idx.js", imports: ["a.js", "b.js"] }, "_hydrate.js": { imports: ["rt.js"] } }, styles: ["g.css"] };
  const a = resolvePageAssets(manifest, "index");
  t.check("hydrate in modules", a.modules.includes("/_ekko/hyd.js"));
  t.check("pageFile resolved", a.pageFile === "/_ekko/idx.js");
  t.check("global styles", a.styles.includes("/_ekko/g.css"));
  t.check("imports preloaded", a.modulepreload.includes("/_ekko/a.js") && a.modulepreload.includes("/_ekko/b.js"));
  t.deep("missing page → no pageFile", resolvePageAssets(manifest, "nope").pageFile, null);
  t.check("custom prefix", resolvePageAssets(manifest, "index", "/static/").pageFile === "/static/idx.js");
}

t.group("createStyleCollector");
{
  const c = createStyleCollector();
  c.add("a", ".x{color:red}");
  c.add("b", ".y{color:blue}");
  t.check("has a", c.has("a"));
  t.check("getStyles HTML", c.getStyles().includes('data-ekko-styled="a"') && c.getStyles().includes(".x{color:red}"));
  t.eq("getStylesArray length", c.getStylesArray().length, 2);
  c.add("a", ".x{color:green}"); 
  t.check("overwrite same id", c.getStyles().includes("green") && !c.getStyles().includes("red"));
  c.reset();
  t.eq("reset clears", c.getStylesArray().length, 0);
  t.check("has after reset false", !c.has("a"));
}

t.group("createApp construction (no listen)");
{
  const app = createApp({ manifest: { hydrate: "h.js", pages: { index: { file: "i.js" } } } });
  t.type("createApp returns object", app, "object");
  t.type("app.resolvePageAssets fn", app.resolvePageAssets, "function");
  t.check("app.resolvePageAssets works", app.resolvePageAssets("index").pageFile === "/_ekko/i.js");
}

rmrf(ROOT);
t.done("ekko:rune covered");
