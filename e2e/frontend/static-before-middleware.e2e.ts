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
import { tempSubdir, writeText, mkdir } from "ekko:fs";
import { asserter } from "../_harness";

const t = asserter();
const PORT = 38662;
const dir = tempSubdir("static-before").replace(/\\/g, "/");
mkdir(dir + "/_ekko");
mkdir(dir + "/assets");
writeText(dir + "/_ekko/app.js", "export const x = 1;\n");
writeText(dir + "/assets/logo.txt", "LOGO");

const app: any = createServer({ host: "127.0.0.1", port: PORT });
app.static("/_ekko", dir + "/_ekko", { before: true });   
app.static("/assets", dir + "/assets");                   
app.use((_req: any, res: any) => { res.redirect("/login"); }); 
app.get("/login", (_q: any, res: any) => res.text("LOGIN"));
app.start();
const base = `http://127.0.0.1:${PORT}`;

t.group("priority static (before:true) bypasses an app gate");
const chunk: any = await fetch(base + "/_ekko/app.js", { redirect: "manual" });
t.eq("/_ekko/app.js served (200, gate bypassed)", chunk.status, 200);
t.check("served as JavaScript", /javascript/i.test((chunk.headers && chunk.headers["content-type"]) || ""));
t.eq("body is the real chunk", (await chunk.text()).trim(), "export const x = 1;");

t.group("normal static is still subject to the gate");
const asset: any = await fetch(base + "/assets/logo.txt", { redirect: "manual" });
t.gte("/assets/ IS gated (redirected by app.use)", asset.status, 300);
t.lt("…a 3xx", asset.status, 400);

t.group("a normal (non-static) path is gated too");
const page: any = await fetch(base + "/", { redirect: "manual" });
t.gte("'/' is gated", page.status, 300);

if (app.stop) app.stop();
t.done("priority static before middleware");
