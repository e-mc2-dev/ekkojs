// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createApp } from "ekko:rune";
import { fetch } from "ekko:web";
import { asserter } from "../_harness";

const t = asserter();
const PORT = 38419;

const app: any = createApp({ port: PORT, host: "127.0.0.1" });
app.api("GET", "/api/notes", () => ({ notes: [] }));
app.api("POST", "/api/notes", (req: any) => req.json());
const handle: any = app.start();

t.group("auto-405 — wrong method on a known API path");
const put: any = await fetch(`http://127.0.0.1:${PORT}/api/notes`, { method: "PUT" });
t.eq("PUT /api/notes → 405 (not 404)", put.status, 405);
const allowHdr = (put.headers && (put.headers.get ? put.headers.get("allow") : put.headers["allow"])) || "";
t.check("405 carries an Allow header listing the registered methods", /GET/.test(String(allowHdr)) && /POST/.test(String(allowHdr)));
const putBody: any = await put.json().catch(() => ({}));
t.eq("405 body error", putBody.error, "Method Not Allowed");
t.check("405 body lists allowed GET+POST", Array.isArray(putBody.allowed) && putBody.allowed.indexOf("GET") >= 0 && putBody.allowed.indexOf("POST") >= 0);

t.group("registered methods still work; unknown path still 404s");
const get: any = await fetch(`http://127.0.0.1:${PORT}/api/notes`);
t.eq("GET /api/notes → 200", get.status, 200);
const miss: any = await fetch(`http://127.0.0.1:${PORT}/api/nope`, { method: "DELETE" });
t.eq("DELETE /api/nope (no methods registered) → 404, not a false 405", miss.status, 404);

handle.stop();
t.check("reached end — server stopped, HMR interval cleared (no hang)", true);
t.done("rune auto-405 (task 297)");
