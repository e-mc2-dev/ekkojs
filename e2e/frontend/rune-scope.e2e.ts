// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { scanRoutes, readManifest } from "ekko:rune";
import { mkdir, writeText, remove, exists } from "ekko:fs";
import { asserter } from "../_harness.ts";

const t = asserter();
const ROOT = "e2e/_dbtmp/runescope";
function rmrf(p: string) { try { if (exists(p)) remove(p); } catch {  } }
rmrf(ROOT); mkdir(ROOT); mkdir(ROOT + "/pages");
writeText(ROOT + "/pages/index.tsx", "x");
writeText(ROOT + "/m.json", JSON.stringify({ hydrate: "h.js", pages: {}, chunks: [] }));

t.group("in-scope reads succeed");
t.notThrows("scanRoutes in-scope", () => scanRoutes(ROOT + "/pages"));
t.gt("scanRoutes finds the page", scanRoutes(ROOT + "/pages").length, 0);
t.eq("readManifest in-scope reads content", readManifest(ROOT + "/m.json").hydrate, "h.js");

t.group("out-of-scope denied / masked");
t.denied("scanRoutes out-of-scope dir denied", () => scanRoutes("e2e/frontend"));
t.eq("readManifest out-of-scope → default (no leak)", readManifest("e2e/_index.md").hydrate, null);

t.group("`..`-escape denied");
t.denied("scanRoutes `..`-escape denied", () => scanRoutes(ROOT + "/../../frontend"));
t.eq("readManifest `..`-escape → default", readManifest(ROOT + "/../../_index.md").hydrate, null);

rmrf(ROOT);
t.done("ekko:rune cybersec scope");
