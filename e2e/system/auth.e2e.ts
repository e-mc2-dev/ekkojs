// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


import { createAuth, totp } from "ekko:auth";
import { asserter } from "../_harness.ts";

const t = asserter();
const auth = createAuth({ secret: "test-secret-key", sessionTTL: 3600 });

t.group("password hashing");
{
  const h = auth.hashPassword("hunter2");
  t.eq("hash has salt:iter:algo:key (4 parts)", h.split(":").length, 4);
  t.eq("algorithm persisted as sha256", h.split(":")[2], "sha256");
  t.check("verify correct password", auth.verifyPassword("hunter2", h));
  t.check("verify rejects wrong password", !auth.verifyPassword("nope", h));
  t.check("two hashes of same pw differ (random salt)", auth.hashPassword("x") !== auth.hashPassword("x"));
}

t.group("JWT");
{
  const tok = auth.jwt.sign({ sub: "u1", role: "admin" }, 3600);
  t.eq("token has 3 segments", tok.split(".").length, 3);
  const v = auth.jwt.verify(tok) as any;
  t.eq("verify returns payload sub", v.sub, "u1");
  t.eq("verify returns role", v.role, "admin");
  t.check("iat set", typeof v.iat === "number");
  t.check("exp set", typeof v.exp === "number");
  const d = auth.jwt.decode(tok) as any;
  t.eq("decode returns payload without verify", d.sub, "u1");
  t.eq("verify rejects garbage → null", auth.jwt.verify("a.b.c") as any, null);
}

t.group("session store");
{
  const id = auth.store.create({ user: { id: "u1" } });
  t.check("create returns id", typeof id === "string" && id.length > 0);
  t.deep("get returns data", auth.store.get(id), { user: { id: "u1" } });
  auth.store.set(id, { user: { id: "u2" } });
  t.deep("set updates data", auth.store.get(id), { user: { id: "u2" } });
  auth.store.destroy(id);
  t.eq("destroy → get null", auth.store.get(id), null);
}

t.group("session middleware + login/logout");
{
  function mk(cookies: any = {}) {
    const setCookies: any[] = [];
    const res: any = { cookie(n: string, v: string, o: any) { setCookies.push({ n, v, o }); return this; }, _setCookies: setCookies };
    const req: any = { cookies };
    return { req, res };
  }
  const { req, res } = mk();
  let nx = false;
  auth.session(req, res, () => { nx = true; });
  t.check("middleware calls next", nx);
  t.check("req.session initialized", typeof req.session === "object");
  req.login({ id: "u1", role: "admin" });
  t.eq("login sets req.user", req.user.id, "u1");
  t.check("login sets a session cookie", res._setCookies.length === 1 && res._setCookies[0].o.httpOnly === true);
  
  const sid = res._setCookies[0].v;
  const r2 = mk({ ekko_session: sid }); let nx2 = false;
  auth.session(r2.req, r2.res, () => { nx2 = true; });
  t.eq("session restored from cookie", r2.req.user.id, "u1");
  req.logout();
  t.eq("logout clears req.user", req.user, null);
}

t.group("required / roles middleware");
{
  function mk(user: any) {
    const res: any = { _code: 0, status(c: number) { this._code = c; return this; }, json() { return this; } };
    return { req: { user }, res };
  }
  let nx = false; const a = mk(null); auth.required()(a.req, a.res, () => { nx = true; });
  t.eq("required blocks anon → 401", a.res._code, 401);
  let nx2 = false; const b = mk({ id: "u" }); auth.required()(b.req, b.res, () => { nx2 = true; });
  t.check("required passes authed", nx2);
  let nx3 = false; const c = mk({ id: "u", role: "user" }); auth.roles("admin")(c.req, c.res, () => { nx3 = true; });
  t.eq("roles blocks wrong role → 403", c.res._code, 403);
  let nx4 = false; const d = mk({ id: "u", role: "admin" }); auth.roles("admin")(d.req, d.res, () => { nx4 = true; });
  t.check("roles passes matching role", nx4);
}

t.group("TOTP");
{
  const setup = totp.setup({ issuer: "Test", account: "a@b.co" });
  t.check("setup returns base32 secret", /^[A-Z2-7=]+$/.test(setup.secret));
  t.eq("setup returns 10 backup codes", setup.backupCodes.length, 10);
  t.check("otpauthUrl format", setup.otpauthUrl.startsWith("otpauth://totp/"));
  t.check("qrCode is data URI", setup.qrCode.startsWith("data:image/svg+xml;base64,"));
  const code = totp.generate({ secret: setup.secret });
  t.check("generate produces 6 digits", /^\d{6}$/.test(code));
  const v = totp.verify({ secret: setup.secret, token: code }) as any;
  t.check("verify own code valid", v.valid === true);
  t.eq("delta 0 for current code", v.delta, 0);
  const b = totp.verifyBackup({ token: setup.backupCodes[0], hashedCodes: setup.backupCodesHashed }) as any;
  t.check("backup code valid", b.valid === true);
  t.eq("backup remaining shrinks", b.remaining.hashes.length, 9);
  t.deep("base32 round-trips", totp.base32Decode(totp.base32Encode(new Uint8Array([1, 2, 3, 4, 5]))), new Uint8Array([1, 2, 3, 4, 5]));
}

t.done("ekko:auth covered");
