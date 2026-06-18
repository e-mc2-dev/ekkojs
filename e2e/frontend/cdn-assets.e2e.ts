// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { resolvePageAssets } from "ekko:rune";
import { htmlShell } from "ekko:ssr";
import { asserter } from "../_harness";

const t = asserter();

const manifest = {
  hydrate: "hydrate-AAA.js",
  styles: ["pages/layout-GLOBAL.css"],
  pages: {
    "index.tsx":  { file: "pages/index-1111.js",  imports: ["chunks/shared-9999.js"], css: ["pages/index-1111.css"] },
    "about.tsx":  { file: "pages/about-2222.js",   imports: ["chunks/shared-9999.js"], css: ["pages/about-2222.css"] },
    "layout.tsx": { file: "pages/layout-3333.js",  imports: [] },
  },
};

const all = (r: any) => [r.pageFile, ...r.styles, ...r.modules, ...r.modulepreload].filter(Boolean);

t.group("no CDN → same-origin /_ekko/ (regression)");
{
  const r: any = resolvePageAssets(manifest, "index.tsx", "/_ekko/", []);
  t.check("every URL is same-origin /_ekko/", all(r).every((u: string) => u.startsWith("/_ekko/")));
  t.eq("pageFile is the relative chunk", r.pageFile, "/_ekko/pages/index-1111.js");
}

t.group("CDN list → every JS+CSS URL is a CDN base + /_ekko/");
const CDN = ["https://a.cdn.example", "https://b.cdn.example"];
{
  const r: any = resolvePageAssets(manifest, "index.tsx", "/_ekko/", CDN);
  t.check("all URLs start with one of the CDN bases", all(r).every((u: string) =>
    CDN.some(b => u.startsWith(b + "/_ekko/"))));
}

t.group("deterministic — a shared chunk maps to the SAME domain on both routes");
{
  const ri: any = resolvePageAssets(manifest, "index.tsx", "/_ekko/", CDN);
  const ra: any = resolvePageAssets(manifest, "about.tsx", "/_ekko/", CDN);
  const sharedOn = (r: any) => r.modulepreload.find((u: string) => u.includes("shared-9999.js"));
  t.ok("shared chunk present on index", sharedOn(ri));
  t.ok("shared chunk present on about", sharedOn(ra));
  t.eq("shared chunk pinned to the same CDN host across routes", sharedOn(ri), sharedOn(ra));
  
  const again: any = resolvePageAssets(manifest, "index.tsx", "/_ekko/", CDN);
  t.eq("same filename → same domain across calls", again.pageFile, ri.pageFile);
}

t.group("spread — across a realistic asset set, BOTH domains are used");
{
  const r: any = resolvePageAssets(manifest, "index.tsx", "/_ekko/", CDN);
  const hosts = new Set(all(r).map((u: string) => u.split("/_ekko/")[0]));
  t.check("more than one CDN host appears across the assets", hosts.size >= 2);
}

t.group("single-domain CDN (degenerate round-robin) works");
{
  const r: any = resolvePageAssets(manifest, "index.tsx", "/_ekko/", ["https://x.cdn"]);
  t.check("all URLs on the single host", all(r).every((u: string) => u.startsWith("https://x.cdn/_ekko/")));
}

t.group("trailing slashes on the CDN base are normalized");
{
  const r: any = resolvePageAssets(manifest, "index.tsx", "/_ekko/", ["https://x.cdn///"]);
  t.check("no double slash before /_ekko/", all(r).every((u: string) => !/\/\/_ekko\//.test(u.replace("https://", ""))));
}

t.group("htmlShell — crossorigin only on cross-origin (CDN) assets");
{
  
  const same = htmlShell({ styles: ["/_ekko/a.css"], modules: ["/_ekko/b.js"], modulepreload: ["/_ekko/c.js"] });
  t.check("same-origin stylesheet has no crossorigin", /<link rel="stylesheet" href="\/_ekko\/a\.css">/.test(same));
  t.check("same-origin module has no crossorigin", /<script type="module" src="\/_ekko\/b\.js"><\/script>/.test(same));
  
  const cdn = htmlShell({
    styles: ["https://a.cdn/_ekko/a.css"],
    modules: ["https://a.cdn/_ekko/b.js"],
    modulepreload: ["https://a.cdn/_ekko/c.js"],
  });
  t.check("cross-origin stylesheet has crossorigin", /<link rel="stylesheet" href="https:\/\/a\.cdn\/_ekko\/a\.css" crossorigin>/.test(cdn));
  t.check("cross-origin modulepreload has crossorigin", /<link rel="modulepreload" href="https:\/\/a\.cdn\/_ekko\/c\.js" crossorigin>/.test(cdn));
  t.check("cross-origin module script has crossorigin", /<script type="module" src="https:\/\/a\.cdn\/_ekko\/b\.js" crossorigin>/.test(cdn));
}

t.done("cdn-assets");
