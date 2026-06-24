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
import { asserter } from "../_harness";

const t = asserter();

let denied = false;
try { scanRoutes("e2e/_dbtmp"); } catch (e) { denied = /PermissionError|access denied|denied/.test(String((e as any)?.message ?? e)); }
if (!denied) {
  console.log("\n✗ MISCONFIGURED — rune-cybersec.e2e.ts must run WITHOUT --allow=fs.");
  console.log("ASSERTIONS 0 1"); Ekko.exit(1);
}

t.group("scanRoutes denied without fs (was unrestricted dir listing)");
t.denied("relative dir denied", () => scanRoutes("e2e/_dbtmp"));
t.denied("absolute dir denied", () => scanRoutes("/etc"));
t.denied("traversal dir denied", () => scanRoutes("e2e/../e2e/_dbtmp"));

t.group("readManifest of a denied path does NOT leak file contents");

{
  const m = readManifest("/etc/hostname");
  t.eq("denied → default hydrate null (no leak)", m.hydrate, null);
  t.deep("denied → empty pages (no leak)", m.pages, {});
}
{
  const m = readManifest("e2e/_dbtmp/../../package.json");
  t.eq("traversal → default (no leak)", m.hydrate, null);
}

t.group("pure logic still works without fs (no native file access)");
t.check("resolvePageAssets pure", resolvePageAssets({ hydrate: "h.js", pages: { index: { file: "i.js" } } }, "index").pageFile === "/_ekko/i.js");
{
  const c = createStyleCollector(); c.add("a", ".x{}");
  t.check("styleCollector pure", c.has("a"));
}

t.group("liveness after a denial");
try { scanRoutes("/root"); } catch {  }
t.check("resolvePageAssets works after denial", resolvePageAssets({ pages: {} }, "x").pageFile === null);

t.done("ekko:rune cybersec");
