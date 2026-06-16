// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createServer, fetch, csrf } from "ekko:web";
import { asserter } from "../_harness.ts";

const t = asserter();
const P = 38334;
const app: any = createServer({ host: "127.0.0.1", port: P });
app.use(csrf());
app.get("/form", (_req: any, res: any) => res.json({ ok: 1 }));
app.post("/submit", (_req: any, res: any) => res.json({ submitted: 1 }));
app.start();
const base = `http://127.0.0.1:${P}`;

function lc(h: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {}; for (const k in h) o[k.toLowerCase()] = h[k]; return o;
}
async function post(token?: string): Promise<number> {
  const headers: Record<string, string> = {};
  if (token !== undefined) headers["x-csrf-token"] = token;
  return (await fetch(base + "/submit", { method: "POST", headers, body: "{}" })).status;
}

t.group("CSRF — token issuance + enforcement (W4.3)");
const g = await fetch(base + "/form");
const gh = lc(g.headers || {});
const token = gh["x-csrf-token"];
t.eq("safe GET → 200", g.status, 200);
t.check("GET issues an x-csrf-token", typeof token === "string" && token.length > 0);

t.eq("POST with no token → 403", await post(undefined), 403);
t.eq("POST with empty token → 403", await post(""), 403);
t.eq("POST with wrong token (same length) → 403", await post("x".repeat(token.length)), 403);
t.eq("POST with wrong token (different length) → 403", await post("short"), 403);
t.eq("POST with correct token → 200", await post(token), 200);

t.group("CSRF — token rotates after a valid use (W4.3)");

t.eq("reused (rotated-out) token → 403", await post(token), 403);

const g2 = await fetch(base + "/form");
const token2 = lc(g2.headers || {})["x-csrf-token"];
t.check("new token differs from old", token2 !== token);
t.eq("POST with fresh token → 200", await post(token2), 200);

app.stop();
t.check("reached end — in-process, no hang", true);
t.done("web CSRF (W4.3)");
