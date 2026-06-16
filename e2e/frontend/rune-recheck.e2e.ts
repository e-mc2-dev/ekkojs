// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { scanRoutes, readManifest, resolvePageAssets, createStyleCollector } from "ekko:rune";
import { mkdir, writeText, remove, exists } from "ekko:fs";
import { asserter } from "../_harness.ts";

const t = asserter();
const ROOT = "e2e/_dbtmp/runerc";
function rmrf(p: string) { try { if (exists(p)) remove(p); } catch {  } }
function mkfile(p: string) { const dir = p.slice(0, p.lastIndexOf("/")); if (!exists(dir)) mkdir(dir); writeText(p, "x"); }

rmrf(ROOT); mkdir(ROOT); mkdir(ROOT + "/pages");
for (const f of ["index.tsx", "users/[id]/posts/[postId].tsx", "docs/index.tsx", "[lang]/[slug].tsx", "(marketing)/pricing.tsx", "deep/a/b/c/page.tsx"]) mkfile(ROOT + "/pages/" + f);

t.group("route mapping edges");
{
  const routes = scanRoutes(ROOT + "/pages");
  const pats = routes.map((r: any) => r.pattern);
  t.check("multi-dynamic /users/:id/posts/:postId", pats.includes("/users/:id/posts/:postId"));
  t.check("nested index /docs", pats.includes("/docs"));
  t.check("two leading dynamics /:lang/:slug", pats.includes("/:lang/:slug"));
  t.check("group stripped /pricing", pats.includes("/pricing"));
  t.check("deep static /deep/a/b/c/page", pats.includes("/deep/a/b/c/page"));
  t.check("all dynamic flagged", routes.filter((r: any) => r.pattern.includes(":")).every((r: any) => r.dynamic));
}

t.group("resolvePageAssets shapes");
t.deep("no hydrate → empty modules", resolvePageAssets({ pages: {} }, "x").modules, []);
t.check("page as string entry", resolvePageAssets({ pages: { p: "p.js" } }, "p").pageFile === "/_ekko/p.js");
t.check("no manifest.pages → null pageFile", resolvePageAssets({ hydrate: "h.js" }, "p").pageFile === null);
{
  const a = resolvePageAssets({ hydrate: "h.js", pages: { p: { file: "p.js", imports: ["x.js", "x.js"] } } }, "p");
  t.check("hydrate present once", a.modules.filter((m: string) => m === "/_ekko/h.js").length === 1);
}

t.group("styleCollector stress");
{
  const c = createStyleCollector();
  for (let i = 0; i < 100; i++) c.add("id" + i, ".c" + i + "{color:red}");
  t.eq("100 styles", c.getStylesArray().length, 100);
  t.check("getStyles contains all", c.getStyles().split("<style").length - 1 === 100);
  c.reset(); t.eq("reset", c.getStylesArray().length, 0);
}

t.group("manifest edges");
writeText(ROOT + "/bad.json", "{not valid json");
t.eq("malformed manifest → default (no throw)", readManifest(ROOT + "/bad.json").hydrate, null);
writeText(ROOT + "/empty.json", "{}");
t.deep("empty manifest object", readManifest(ROOT + "/empty.json").pages ?? {}, {});
t.eq("scanRoutes on a file (not dir) → []", scanRoutes(ROOT + "/bad.json").length, 0);
t.eq("scanRoutes empty dir → []", (() => { mkdir(ROOT + "/emptydir"); return scanRoutes(ROOT + "/emptydir").length; })(), 0);

rmrf(ROOT);
t.done("ekko:rune recheck");
