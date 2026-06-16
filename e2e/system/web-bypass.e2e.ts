// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createServer, fetch, validateContentType } from "ekko:web";
import { asserter } from "../_harness.ts";

const t = asserter();
const P = 38331;
const app: any = createServer({ host: "127.0.0.1", port: P });
app.use(validateContentType({ types: ["application/json"] }));
app.post("/data", (_req: any, res: any) => res.json({ ok: 1 }));
app.start();
const base = `http://127.0.0.1:${P}`;
const status = async (ct?: string) => (await fetch(base + "/data", { method: "POST", headers: ct ? { "content-type": ct } : {}, body: "{}" })).status;

t.group("validateContentType — exact media-type allow-list (W4.3)");
t.eq("application/json → 200", await status("application/json"), 200);
t.eq("application/json; charset=utf-8 → 200 (param stripped)", await status("application/json; charset=utf-8"), 200);
t.eq("APPLICATION/JSON (case) → 200", await status("APPLICATION/JSON"), 200);
t.eq("application/json-evil → 415 (was a startsWith bypass)", await status("application/json-evil"), 415);
t.eq("application/jsonx → 415", await status("application/jsonx"), 415);
t.eq("text/html → 415", await status("text/html"), 415);
t.eq("empty content-type → 415 (task 229)", await status(undefined), 415);
app.stop();
t.check("reached end → middleware sweep ran in-process, no hang", true);

t.done("web middleware bypass (W4.3)");
