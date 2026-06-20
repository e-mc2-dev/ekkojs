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
const P = 38332;
const app: any = createServer({ host: "127.0.0.1", port: P });

app.get("/inject", (_req: any, res: any) => {
  res.header("x-test", "safe\r\nx-injected: pwned");        
  res.header("x-multi\r\nx-evil", "v");                       
  res.json({ ok: 1 });
});
app.get("/red", (_req: any, res: any) => {
  res.redirect("/landing\r\nx-redir-injected: pwned");       
});
app.get("/landingx-redir-injected: pwned", (_req: any, res: any) => res.json({ landed: 1 }));
app.start();
const base = `http://127.0.0.1:${P}`;

function lc(h: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k in h) o[k.toLowerCase()] = h[k];
  return o;
}

t.group("res.header() — CRLF scrubbed, no response splitting (W4.4)");
const r = await fetch(base + "/inject");
const h = lc(r.headers || {});
t.eq("request succeeds (pre-fix Kestrel would reject the control char)", r.status, 200);
t.eq("injected header NOT split out", h["x-injected"], undefined);
t.eq("evil header (from CRLF name) NOT split out", h["x-evil"], undefined);
t.check("x-test value carries no newline", !(h["x-test"] || "").includes("\n") && !(h["x-test"] || "").includes("\r"));
t.check("x-test value retained (scrubbed, not dropped)", (h["x-test"] || "").indexOf("safe") === 0);

t.group("res.redirect() — CRLF in Location scrubbed (W4.4)");

let redStatus = -1, threw = false;
try { redStatus = (await fetch(base + "/red")).status; } catch { threw = true; }
t.eq("redirect did not throw / fail the response write", threw, false);
t.check("redirect resolved to a real HTTP status (not 0)", redStatus > 0);

app.stop();
t.check("reached end — in-process, no hang", true);
t.done("web header/CRLF injection (W4.4)");
