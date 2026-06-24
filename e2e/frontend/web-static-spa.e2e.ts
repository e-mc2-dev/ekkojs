// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createServer, fetch } from "ekko:web";
import { tempSubdir, writeText, mkdir, remove } from "ekko:fs";
import { asserter } from "../_harness";

const t = asserter();
const PORT = 38631;

const dir = tempSubdir("web-spa").replace(/\\/g, "/");
const dist = dir + "/dist";
mkdir(dist);
writeText(dist + "/index.html", "<!doctype html><html><body><main id=\"app\">spa-shell</main></body></html>");
writeText(dist + "/main.js", "export const x = 1;\n");

const server: any = createServer({ port: PORT, host: "127.0.0.1" });
server.get("/api/ping", (_req: any, res: any) => res.json({ ok: true }));
server.static("/", dist, { spa: true });
server.start();

const base = `http://127.0.0.1:${PORT}`;
const ct = (r: any) =>
  (r.headers && (r.headers.get ? r.headers.get("content-type") : r.headers["content-type"])) || "";

t.group("server.static SPA fallback + routing order");

{
  const root: any = await fetch(`${base}/`);
  t.eq("/ → 200", root.status, 200);
  t.check("/ serves index.html (text/html)", /text\/html/.test(ct(root)));
  const body: any = await root.text().catch(() => "");
  t.check("/ body is the SPA shell", /spa-shell/.test(String(body)));
}
{
  const js: any = await fetch(`${base}/main.js`);
  t.eq("/main.js → 200 (root-mounted asset served, not just '/')", js.status, 200);
  t.check("/main.js is javascript", /javascript/.test(ct(js)));
}
{
  const api: any = await fetch(`${base}/api/ping`);
  t.eq("/api/ping → 200 (route wins; NOT shadowed by the SPA fallback)", api.status, 200);
  const body: any = await api.json().catch(() => ({}));
  t.eq("/api/ping returns JSON", body.ok, true);
}
{
  const deep: any = await fetch(`${base}/about/settings`);
  t.eq("/about/settings (extensionless deep link) → 200 (SPA fallback)", deep.status, 200);
  t.check("deep link serves index.html", /text\/html/.test(ct(deep)));
}
{
  const miss: any = await fetch(`${base}/missing.js`);
  t.eq("/missing.js (missing asset, has extension) → 404 (NOT SPA)", miss.status, 404);
}

if (server.stop) server.stop();
try { remove(dir, { recursive: true }); } catch {  }
t.done("web static SPA (m35)");
