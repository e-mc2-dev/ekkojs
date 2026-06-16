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
  cors, rateLimit, helmet, safePath, bodyLimit, csrf, errorHandler, timeout,
  httpsRedirect, secureCookies, requestId, ipFilter, validateContentType,
} from "ekko:web";
import { asserter } from "../_harness.ts";

const t = asserter();

function mk(over: any = {}) {
  const h: any = {};
  const state: any = { code: 0, body: null, sent: false };
  const res: any = {
    _h: h, _s: 200, get _sent() { return state.sent; },
    status(c: number) { state.code = c; this._s = c; return this; },
    header(k: string, v: any) { h[k.toLowerCase()] = v; return this; },
    json(d: any) { state.sent = true; state.body = d; this._h["content-type"] = "application/json"; },
    text(b: any) { state.sent = true; state.body = b; },
    html(b: any) { state.sent = true; state.body = b; },
    send(b: any) { state.sent = true; state.body = b; },
    redirect(url: string, code?: number) { this._s = code || 302; state.code = this._s; h["location"] = url; state.sent = true; },
    cookie(_n: any, _v: any, _o: any) { return this; },
    get _code() { return state.code; }, get _body() { return state.body; },
  };
  const req: any = Object.assign({ method: "GET", path: "/", headers: {}, ip: "1.2.3.4" }, over);
  let nx = false;
  const next = () => { nx = true; };
  return { req, res, next, called: () => nx };
}

t.group("cors");
{
  const m = mk({ headers: { origin: "https://a.com" } });
  cors({ origin: "*" })(m.req, m.res, m.next);
  t.eq("wildcard ACAO", m.res._h["access-control-allow-origin"], "*");
  t.check("non-OPTIONS calls next", m.called());
}
{
  const m = mk({ headers: { origin: "https://good.com" }, method: "OPTIONS" });
  cors({ origin: ["https://good.com"], credentials: true })(m.req, m.res, m.next);
  t.eq("array origin reflected", m.res._h["access-control-allow-origin"], "https://good.com");
  t.eq("credentials header", m.res._h["access-control-allow-credentials"], "true");
  t.eq("OPTIONS preflight → 204", m.res._code, 204);
  t.check("OPTIONS does NOT call next", !m.called());
}

t.group("helmet — security headers");
{
  const m = mk();
  helmet({})(m.req, m.res, m.next);
  t.eq("nosniff", m.res._h["x-content-type-options"], "nosniff");
  t.eq("frameguard DENY", m.res._h["x-frame-options"], "DENY");
  t.eq("xss-protection disabled (0)", m.res._h["x-xss-protection"], "0");
  t.eq("referrer-policy", m.res._h["referrer-policy"], "strict-origin-when-cross-origin");
  t.eq("default CSP", m.res._h["content-security-policy"], "default-src 'self'");
  t.check("HSTS present", String(m.res._h["strict-transport-security"]).includes("max-age="));
  t.check("permissions-policy present", String(m.res._h["permissions-policy"]).includes("camera=()"));
  t.check("calls next", m.called());
}
{
  const m = mk();
  helmet({ frameguard: "SAMEORIGIN", contentSecurityPolicy: "default-src 'none'" })(m.req, m.res, m.next);
  t.eq("custom frameguard", m.res._h["x-frame-options"], "SAMEORIGIN");
  t.eq("custom CSP", m.res._h["content-security-policy"], "default-src 'none'");
}

t.group("rateLimit");
{
  const mw = rateLimit({ max: 2, window: 60000 });
  const a = mk(); mw(a.req, a.res, a.next); t.check("1st under limit → next", a.called());
  const b = mk(); mw(b.req, b.res, b.next); t.check("2nd under limit → next", b.called());
  const c = mk(); mw(c.req, c.res, c.next); t.eq("3rd over limit → 429", c.res._code, 429); t.check("3rd does not call next", !c.called());
  t.eq("remaining header set", a.res._h["x-ratelimit-limit"], "2");
}

t.group("ipFilter");
{
  const a = mk({ ip: "9.9.9.9" }); ipFilter({ deny: ["9.9.9.9"] })(a.req, a.res, a.next);
  t.eq("denied ip → 403", a.res._code, 403);
  const b = mk({ ip: "1.1.1.1" }); ipFilter({ deny: ["9.9.9.9"] })(b.req, b.res, b.next);
  t.check("other ip passes", b.called());
  const c = mk({ ip: "2.2.2.2" }); ipFilter({ allow: ["1.1.1.1"] })(c.req, c.res, c.next);
  t.eq("not in allowlist → 403", c.res._code, 403);
}

t.group("requestId");
{
  const a = mk(); requestId()(a.req, a.res, a.next);
  t.check("generates id", !!a.res._h["x-request-id"]); t.check("sets req.id", !!a.req.id); t.check("next", a.called());
  const b = mk({ headers: { "x-request-id": "abc-123" } }); requestId()(b.req, b.res, b.next);
  t.eq("echoes incoming id", b.res._h["x-request-id"], "abc-123");
}

t.group("csrf");
{
  const mw = csrf({});
  const g = mk({ method: "GET" }); mw(g.req, g.res, g.next);
  const token = g.res._h["x-csrf-token"];
  t.check("GET issues token + next", !!token && g.called());
  const p = mk({ method: "POST", ip: "1.2.3.4", headers: { "x-csrf-token": token } }); mw(p.req, p.res, p.next);
  t.check("POST with matching token passes", p.called());
  t.check("token rotated after POST", p.res._h["x-csrf-token"] !== token);
}

t.group("httpsRedirect");
{
  const a = mk({ path: "/x", headers: { host: "ex.com" } });
  httpsRedirect({})(a.req, a.res, a.next);
  t.eq("http → 301", a.res._code, 301);
  t.eq("redirects to https", a.res._h["location"], "https://ex.com/x");
  const b = mk({ path: "/x", headers: { "x-forwarded-proto": "https" } });
  httpsRedirect({})(b.req, b.res, b.next);
  t.check("x-forwarded-proto https → next", b.called());
}

t.group("secureCookies — flags");
{
  const m = mk(); secureCookies()(m.req, m.res, m.next);
  m.res.cookie("sid", "v1", {});
  const c = String(m.res._h["set-cookie"]);
  t.check("HttpOnly default", c.includes("HttpOnly"));
  t.check("Secure default", c.includes("Secure"));
  t.check("SameSite default Lax", c.includes("SameSite=Lax"));
  t.check("value encoded", c.includes("sid=v1"));
}

t.group("validateContentType");
{
  const a = mk({ method: "POST", headers: { "content-type": "application/json" } });
  validateContentType({})(a.req, a.res, a.next); t.check("allowed type passes", a.called());
  const b = mk({ method: "GET" });
  validateContentType({})(b.req, b.res, b.next); t.check("non-body method skips", b.called());
}

t.group("bodyLimit — under limit");
{
  const m = mk({ method: "POST", headers: { "content-length": "5" }, body: "hello" });
  bodyLimit({ max: 100 })(m.req, m.res, m.next);
  t.check("under limit passes", m.called());
}

t.group("errorHandler + timeout wrappers");
{
  const m = mk();
  t.notThrows("errorHandler wraps next", () => errorHandler({})(m.req, m.res, () => {}));
  const m2 = mk();
  t.notThrows("timeout installs + next", () => timeout(1000)(m2.req, m2.res, m2.next));
  t.check("timeout calls next", m2.called());
}

t.done("ekko:web covered");
