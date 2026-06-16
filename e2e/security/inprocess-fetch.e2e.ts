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
import { asserter } from "../_harness.ts";

const t = asserter();
const PORT = 38217;
const app: any = createServer({ host: "127.0.0.1", port: PORT });
app.get("/", (_req: any, res: any) => res.text("inproc-ok"));
app.get("/json", (_req: any, res: any) => res.json({ a: 1, b: "x" }));

t.group("in-process server+client round-trip (W2.6 — was a startup race)");
app.start(); 
const r: any = await fetch(`http://127.0.0.1:${PORT}/`);
t.eq("immediate in-process fetch → status 200", r.status, 200);
t.eq("text body round-trips", await r.text(), "inproc-ok");
const r2: any = await fetch(`http://127.0.0.1:${PORT}/json`);
t.eq("second route → status 200", r2.status, 200);
t.check("json body round-trips", (await r2.text()).includes('"a":1'));
app.stop();
t.check("reached end → no startup race / no hang", true);

t.done("in-process fetch (W2.6)");
