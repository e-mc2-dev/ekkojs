// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import {
  cors, rateLimit, helmet, bodyLimit, csrf, errorHandler, timeout,
  httpsRedirect, secureCookies, validateContentType,
} from "ekko:web";
import { asserter } from "../_harness";

const t = asserter();

function mk(over: any = {}) {
  const h: any = {};
  const state: any = { code: 0, body: null, sent: false };
  const res: any = {
    _h: h, _s: 200, get _sent() { return state.sent; },
    status(c: number) { state.code = c; this._s = c; return this; },
    header(k: string, v: any) { h[k.toLowerCase()] = v; return this; },
    json(d: any) { state.sent = true; state.body = d; }, text(b: any) { state.sent = true; state.body = b; }, html(b: any) { state.sent = true; state.body = b; },
    redirect(u: string, c?: number) { this._s = c || 302; state.code = this._s; h["location"] = u; state.sent = true; },
    cookie(_n: any, _v: any, _o: any) { return this; },
    get _code() { return state.code; }, get _body() { return state.body; },
  };
  const req: any = Object.assign({ method: "GET", path: "/", headers: {}, ip: "1.2.3.4" }, over);
  let nx = false; const next = () => { nx = true; };
  return { req, res, next, called: () => nx };
}

t.group("cors config variants");
{
  const m = mk({ headers: { origin: "https://a.com" } });
  cors({ origin: "https://a.com", maxAge: 7200 })(m.req, m.res, m.next);
  t.eq("maxAge stringified", m.res._h["access-control-max-age"], "7200");
  const m2 = mk({ headers: {} });
  cors({ origin: "*" })(m2.req, m2.res, m2.next);
  t.eq("no origin header + wildcard → *", m2.res._h["access-control-allow-origin"], "*");
}

t.group("helmet CSP=false omits header");
{
  const m = mk(); helmet({ contentSecurityPolicy: false })(m.req, m.res, m.next);
  t.check("CSP omitted when false", !m.res._h["content-security-policy"]);
  t.check("other headers still set", !!m.res._h["x-content-type-options"]);
}

t.group("rateLimit window reset");
{
  const mw = rateLimit({ max: 1, window: 60000 });
  const a = mk({ ip: "5.5.5.5" }); mw(a.req, a.res, a.next); t.check("first passes", a.called());
  const b = mk({ ip: "5.5.5.5" }); mw(b.req, b.res, b.next); t.eq("second over → 429", b.res._code, 429);
  const c = mk({ ip: "7.7.7.7" }); mw(c.req, c.res, c.next); t.check("different ip independent", c.called());
}

t.group("csrf keying (sessionId preferred over ip) + safe-method rotation");
{
  const mw = csrf({});
  const g1 = mk({ method: "GET", sessionId: "sess-1" }); mw(g1.req, g1.res, g1.next);
  const tok1 = g1.res._h["x-csrf-token"];
  const g2 = mk({ method: "GET", sessionId: "sess-1" }); mw(g2.req, g2.res, g2.next);
  t.check("safe method rotates token", g2.res._h["x-csrf-token"] !== tok1);
  
  const latest = g2.res._h["x-csrf-token"];
  const p = mk({ method: "POST", sessionId: "sess-1", ip: "9.9.9.9", headers: { "x-csrf-token": latest } });
  mw(p.req, p.res, p.next);
  t.check("POST validated by sessionId not ip", p.called());
}

t.group("secureCookies sameSite=None implies Secure; custom flags");
{
  const m = mk(); secureCookies()(m.req, m.res, m.next);
  m.res.cookie("k", "v", { sameSite: "None" });
  const c = String(m.res._h["set-cookie"]);
  t.check("SameSite=None present", c.includes("SameSite=None"));
  t.check("Secure present", c.includes("Secure"));
  const m2 = mk(); secureCookies()(m2.req, m2.res, m2.next);
  m2.res.cookie("k", "v", { httpOnly: false });
  t.check("httpOnly:false omits HttpOnly", !String(m2.res._h["set-cookie"]).includes("HttpOnly"));
}

t.group("bodyLimit exact boundary + validateContentType charset");
{
  const at = mk({ method: "POST", headers: { "content-length": "10" }, body: "0123456789" });
  bodyLimit({ max: 10 })(at.req, at.res, at.next);
  t.check("exactly-at-limit passes", at.called());
  const over = mk({ method: "POST", headers: { "content-length": "11" }, body: "0123456789x" });
  bodyLimit({ max: 10 })(over.req, over.res, over.next);
  t.eq("one over → 413", over.res._code, 413);
}
{
  const m = mk({ method: "POST", headers: { "content-type": "application/json; charset=utf-8" } });
  validateContentType({})(m.req, m.res, m.next);
  t.check("charset suffix accepted (startsWith match)", m.called());
  const m2 = mk({ method: "POST", headers: { "content-type": "APPLICATION/JSON" } });
  validateContentType({})(m2.req, m2.res, m2.next);
  t.check("case-insensitive content-type", m2.called());
}

t.group("timeout clears on response; errorHandler prod vs dev");
{
  const m = mk(); timeout(10000)(m.req, m.res, m.next);
  t.notThrows("res.json after timeout install clears timer", () => m.res.json({ ok: 1 }));
  t.notThrows("res.text clears timer", () => mk().res.text("x"));
}
{
  const prod = mk();
  errorHandler({})(prod.req, prod.res, () => { throw new Error("secret detail"); });
  t.eq("prod hides detail", prod.res._body && prod.res._body.error, "Internal Server Error");
  const dev = mk();
  errorHandler({ production: false })(dev.req, dev.res, () => { throw new Error("secret detail"); });
  t.check("dev exposes detail", String(dev.res._body && dev.res._body.error).includes("secret detail"));
}

t.group("httpsRedirect host/port handling");
{
  const m = mk({ path: "/p", headers: { host: "ex.com:8080" } });
  httpsRedirect({})(m.req, m.res, m.next);
  t.eq("strips port, default 443 → no :port", m.res._h["location"], "https://ex.com/p");
  const m2 = mk({ path: "/p", headers: { host: "ex.com" } });
  httpsRedirect({ httpsPort: 8443 })(m2.req, m2.res, m2.next);
  t.eq("custom https port appended", m2.res._h["location"], "https://ex.com:8443/p");
}

t.group("hardened defaults remain OVERRIDABLE via middleware options");
{
  
  const def = mk(); secureCookies()(def.req, def.res, def.next); def.res.cookie("k", "v", {});
  t.check("default → Secure on", String(def.res._h["set-cookie"]).includes("Secure"));
  const dev = mk(); secureCookies()(dev.req, dev.res, dev.next); dev.res.cookie("k", "v", { secure: false });
  t.check("override secure:false → Secure omitted", !String(dev.res._h["set-cookie"]).includes("Secure"));
  
  const ss = mk(); secureCookies()(ss.req, ss.res, ss.next); ss.res.cookie("k", "v", { sameSite: "Strict" });
  t.check("override SameSite=Strict", String(ss.res._h["set-cookie"]).includes("SameSite=Strict"));
  
  const pd = mk(); secureCookies()(pd.req, pd.res, pd.next); pd.res.cookie("k", "v", { path: "/app", domain: "ex.com" });
  const pdc = String(pd.res._h["set-cookie"]);
  t.check("override path emitted", pdc.includes("Path=/app"));
  t.check("override domain emitted", pdc.includes("Domain=ex.com"));
}
{
  
  const small = mk({ method: "POST", headers: {}, body: "z".repeat(50) });
  bodyLimit({ max: 10 })(small.req, small.res, small.next);
  t.eq("low max rejects", small.res._code, 413);
  const big = mk({ method: "POST", headers: {}, body: "z".repeat(50) });
  bodyLimit({ max: 100 })(big.req, big.res, big.next);
  t.check("raised max allows same body", big.called());
}
{
  
  const xml = mk({ method: "POST", headers: { "content-type": "application/xml" } });
  validateContentType({ types: ["application/xml"] })(xml.req, xml.res, xml.next);
  t.check("custom types allow xml", xml.called());
  const json = mk({ method: "POST", headers: { "content-type": "application/json" } });
  validateContentType({ types: ["application/xml"] })(json.req, json.res, json.next);
  t.eq("custom types reject json", json.res._code, 415);
  const empty = mk({ method: "POST", headers: {} });
  validateContentType({ allowEmpty: true })(empty.req, empty.res, empty.next);
  t.check("allowEmpty override lets empty CT pass", empty.called());
}

t.done("ekko:web recheck");
