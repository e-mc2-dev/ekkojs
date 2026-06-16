// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { safePath, secureCookies, bodyLimit, validateContentType, cors, csrf, ipFilter, helmet } from "ekko:web";
import { asserter } from "../_harness.ts";

const t = asserter();

function mk(over: any = {}) {
  const h: any = {};
  const state: any = { code: 0, sent: false };
  const res: any = {
    _h: h, _s: 200, get _sent() { return state.sent; },
    status(c: number) { state.code = c; this._s = c; return this; },
    header(k: string, v: any) { h[k.toLowerCase()] = v; return this; },
    json(d: any) { state.sent = true; }, text(b: any) { state.sent = true; }, html(b: any) { state.sent = true; },
    redirect(u: string, c?: number) { this._s = c || 302; state.code = this._s; state.sent = true; },
    cookie(_n: any, _v: any, _o: any) { return this; },
    get _code() { return state.code; },
  };
  const req: any = Object.assign({ method: "GET", path: "/", headers: {}, ip: "1.2.3.4" }, over);
  let nx = false; const next = () => { nx = true; };
  return { req, res, next, called: () => nx };
}

t.group("BUG A — safePath traversal guard cannot be bypassed");
function blocked(path: string) { const m = mk({ path }); safePath()(m.req, m.res, m.next); return m.res._code === 403 && !m.called(); }
t.check("plain .. blocked", blocked("/a/../b"));
t.check("single-encoded %2e%2e blocked", blocked("/a/%2e%2e/b"));
t.check("DOUBLE-encoded %252e%252e blocked", blocked("/a/%252e%252e/b"));
t.check("triple-encoded blocked", blocked("/a/%25252e%25252e/b"));
t.check("encoded slash + dots %2e%2e%2f blocked", blocked("/%2e%2e%2fetc"));
t.check("backslash variant %2e%2e%5c blocked", blocked("/%2e%2e%5cwin"));
{
  const m = mk({ path: "/safe/file.css" }); safePath()(m.req, m.res, m.next);
  t.check("clean path still passes", m.called());
}

t.group("BUG B — cookie name/path/domain CRLF injection neutralized");
{
  const m = mk(); secureCookies()(m.req, m.res, m.next);
  m.res.cookie("a\r\nSet-Cookie: evil=1", "v", {});
  const c = String(m.res._h["set-cookie"]);

  t.check("no CR in cookie", c.indexOf("\r") === -1);
  t.check("no LF in cookie", c.indexOf("\n") === -1);
  t.eq("cookie is a single line (no splitting)", c.split(/\r|\n/).length, 1);
}
{
  const m = mk(); secureCookies()(m.req, m.res, m.next);
  m.res.cookie("sid", "v", { path: "/x\r\nLocation: http://evil", domain: "e.com\r\nX: y" });
  const c = String(m.res._h["set-cookie"]);
  t.check("path CR/LF scrubbed", c.indexOf("\r") === -1 && c.indexOf("\n") === -1);
  t.eq("domain CR/LF cannot split header", c.split(/\r|\n/).length, 1);
}

t.group("BUG C — bodyLimit honors actual body, not just content-length");
{
  
  const m = mk({ method: "POST", headers: {}, body: "x".repeat(50) });
  bodyLimit({ max: 10 })(m.req, m.res, m.next);
  t.eq("oversize body, no content-length → 413", m.res._code, 413);
  t.check("does not call next", !m.called());
}
{
  
  const m = mk({ method: "POST", headers: { "content-length": "1" }, body: "y".repeat(50) });
  bodyLimit({ max: 10 })(m.req, m.res, m.next);
  t.eq("lying content-length → 413 on actual", m.res._code, 413);
}
{
  
  const m = mk({ method: "POST", headers: {}, bodyBytes: new Uint8Array(50) });
  bodyLimit({ max: 10 })(m.req, m.res, m.next);
  t.eq("oversize bodyBytes → 413", m.res._code, 413);
}
{
  const m = mk({ method: "POST", headers: {}, body: "small" });
  bodyLimit({ max: 100 })(m.req, m.res, m.next);
  t.check("under-limit body passes", m.called());
}

t.group("BUG D — validateContentType rejects empty content-type on body methods");
function ctResult(over: any) { const m = mk(over); validateContentType(over.opts || {})(m.req, m.res, m.next); return { code: m.res._code, next: m.called() }; }
{
  const r = ctResult({ method: "POST", headers: {} });
  t.eq("POST empty CT → 415", r.code, 415); t.check("POST empty CT does not pass", !r.next);
}
{
  const r = ctResult({ method: "PUT", headers: {} });
  t.eq("PUT empty CT → 415", r.code, 415);
}
{
  const r = ctResult({ method: "POST", headers: {}, opts: { allowEmpty: true } });
  t.check("allowEmpty opts back in", r.next);
}
{
  const r = ctResult({ method: "POST", headers: { "content-type": "text/html" } });
  t.eq("disallowed type → 415", r.code, 415);
}
{
  const r = ctResult({ method: "GET", headers: {} });
  t.check("GET (non-body) still skips", r.next);
}

t.group("cors does not leak to non-allowlisted origin");
{
  const m = mk({ headers: { origin: "https://evil.com" } });
  cors({ origin: ["https://good.com"], credentials: true })(m.req, m.res, m.next);
  t.check("no ACAO for evil origin", !m.res._h["access-control-allow-origin"]);
  t.check("no credentials header for evil origin", !m.res._h["access-control-allow-credentials"]);
}

t.group("csrf rejects forged / missing token");
{
  const mw = csrf({});
  const g = mk({ method: "GET" }); mw(g.req, g.res, g.next); 
  const noTok = mk({ method: "POST", ip: "1.2.3.4", headers: {} }); mw(noTok.req, noTok.res, noTok.next);
  t.eq("POST without token → 403", noTok.res._code, 403);
  const forged = mk({ method: "POST", ip: "1.2.3.4", headers: { "x-csrf-token": "not-the-token" } }); mw(forged.req, forged.res, forged.next);
  t.eq("POST with forged token → 403", forged.res._code, 403);
}

t.group("ipFilter denylist + allowlist enforced");
{
  const a = mk({ ip: "6.6.6.6" }); ipFilter({ deny: ["6.6.6.6"] })(a.req, a.res, a.next);
  t.eq("denylisted → 403", a.res._code, 403); t.check("denylisted blocked", !a.called());
  const b = mk({ ip: "3.3.3.3" }); ipFilter({ allow: ["1.1.1.1"] })(b.req, b.res, b.next);
  t.eq("not-allowlisted → 403", b.res._code, 403);
}

t.group("helmet sets hardening headers");
{
  const m = mk(); helmet({})(m.req, m.res, m.next);
  t.eq("nosniff", m.res._h["x-content-type-options"], "nosniff");
  t.eq("frame DENY", m.res._h["x-frame-options"], "DENY");
  t.check("CSP set", !!m.res._h["content-security-policy"]);
}

t.done("ekko:web cybersec");
