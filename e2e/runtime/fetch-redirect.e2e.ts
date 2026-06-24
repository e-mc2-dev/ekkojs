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
import { asserter } from "../_harness";

const t = asserter();
const PORT = 38656;
const app: any = createServer({ host: "127.0.0.1", port: PORT });
app.get("/go", (_req: any, res: any) => res.redirect("/dest"));   
app.get("/dest", (_req: any, res: any) => res.text("DEST"));
app.start(); 
const base = `http://127.0.0.1:${PORT}`;

t.group("fetch redirect mode");
const manual: any = await fetch(base + "/go", { redirect: "manual" });
t.gte("manual returns a 3xx (not followed)", manual.status, 300);
t.lt("manual is < 400", manual.status, 400);
t.eq("manual exposes the Location header", manual.headers["location"], "/dest");

const follow: any = await fetch(base + "/go", { redirect: "follow" });
t.eq("follow → 200 (followed to /dest)", follow.status, 200);
t.eq("follow lands on the destination body", (await follow.text()).trim(), "DEST");

const def: any = await fetch(base + "/go");
t.eq("default follows → 200", def.status, 200);

let errored = false;
try { const r: any = await fetch(base + "/go", { redirect: "error" }); void r.status; } catch { errored = true; }
t.check("error mode rejects on a redirect", errored);

const direct: any = await fetch(base + "/dest", { redirect: "manual" });
t.eq("manual on a non-redirect (200) is unaffected", direct.status, 200);

if (app.stop) app.stop();
t.done("fetch redirect mode");
