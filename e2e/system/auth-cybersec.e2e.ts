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
import { asserter } from "../_harness";

const t = asserter();
const auth = createAuth({ secret: "s3cr3t" });
const B = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function b64u(s: string) { let r = ""; for (let i = 0; i < s.length; i += 3) { const a = s.charCodeAt(i), b = s.charCodeAt(i + 1), c = s.charCodeAt(i + 2); r += B[a >> 2] + B[((a & 3) << 4) | (b >> 4)] + ((i + 1 < s.length) ? B[((b & 15) << 2) | (c >> 6)] : "=") + ((i + 2 < s.length) ? B[c & 63] : "="); } return r.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }

t.group("JWT forgery resistance");
{
  const tok = auth.jwt.sign({ sub: "u1", role: "user" }, 3600);
  const [h, pl, sg] = tok.split(".");
  t.eq("valid token verifies", (auth.jwt.verify(tok) as any).sub, "u1");
  t.eq("tampered payload (orig sig) → null", auth.jwt.verify(h + "." + b64u('{"sub":"admin","role":"admin","iat":1}') + "." + sg) as any, null);
  const none = b64u('{"alg":"none","typ":"JWT"}');
  t.eq("alg:none empty sig → null", auth.jwt.verify(none + "." + pl + ".") as any, null);
  t.eq("alg:none reusing sig → null", auth.jwt.verify(none + "." + pl + "." + sg) as any, null);
  t.eq("cross-secret → null", createAuth({ secret: "other" }).jwt.verify(tok) as any, null);
  t.eq("expired → null", auth.jwt.verify(auth.jwt.sign({ sub: "u1" }, -10)) as any, null);
  t.eq("malformed (2 parts) → null", auth.jwt.verify("a.b") as any, null);
  t.eq("malformed (4 parts) → null", auth.jwt.verify("a.b.c.d") as any, null);
  t.check("decode does NOT authenticate (returns unverified)", (auth.jwt.decode(none + "." + pl + ".") as any).sub === "u1");
}

t.group("password verify safety + BUG A regression (algorithm persisted)");
{
  const h = auth.hashPassword("pw");
  t.check("wrong password → false", !auth.verifyPassword("nope", h));
  t.check("garbage hash → false (no throw)", !auth.verifyPassword("pw", "garbage"));
  t.check("empty hash → false", !auth.verifyPassword("pw", ""));
  t.check("malformed 2-part hash → false", !auth.verifyPassword("pw", "aa:bb"));
  
  const h512 = auth.hashPassword("pw", { algorithm: "sha512" });
  t.eq("sha512 hash stores algo", h512.split(":")[2], "sha512");
  t.check("sha512 hash verifies (BUG A fixed)", auth.verifyPassword("pw", h512));
  t.check("sha512 hash rejects wrong pw", !auth.verifyPassword("wrong", h512));
  
  const legacy = h.split(":"); 
  const legacy3 = legacy[0] + ":" + legacy[1] + ":" + legacy[3];
  t.check("legacy 3-part sha256 hash still verifies", auth.verifyPassword("pw", legacy3));
}

t.group("OAuth CSRF (state) + PKCE + provider validation");
{
  const a = createAuth({ secret: "x" });
  a.oauth.provider({ name: "test", authorizeUrl: "https://p/auth", tokenUrl: "https://p/tok", clientId: "id", clientSecret: "sec", scopes: ["a"] });
  const url = a.oauth.getAuthorizeUrl("test", "https://cb", "state123", "challengeABC");
  t.check("authorize URL carries state", url.includes("state=state123"));
  t.check("authorize URL carries PKCE challenge", url.includes("code_challenge=challengeABC") && url.includes("code_challenge_method=S256"));
  t.throws("provider missing clientId throws", () => a.oauth.provider({ name: "bad", authorizeUrl: "u", tokenUrl: "u", clientSecret: "s" } as any), /clientId/);
  
  const routes = a.oauth.oauthRoutes("test", { baseUrl: "http://localhost:3000" });
  let errCalled = false;
  const res: any = { status() { return this; }, json(d: any) { errCalled = true; this._body = d; }, redirect() { errCalled = true; } };
  routes.callbackHandler({ query: "code=abc&state=forged-not-in-store" } as any, res);
  t.check("callback with unknown state → error (CSRF blocked)", errCalled);
}

t.group("TOTP replay / out-of-window");
{
  const s = totp.setup({ issuer: "T", account: "a" });
  t.check("wrong code invalid", !totp.verify({ secret: s.secret, token: "000000" }).valid);
  
  const past = totp.generate({ secret: s.secret, time: Math.floor(Date.now() / 1000) - 600 });
  t.check("far-past code invalid (window=1)", !totp.verify({ secret: s.secret, token: past }).valid);
  
  const first = totp.verifyBackup({ token: s.backupCodes[0], hashedCodes: s.backupCodesHashed }) as any;
  t.check("backup accepted once", first.valid);
  const replay = totp.verifyBackup({ token: s.backupCodes[0], hashedCodes: first.remaining }) as any;
  t.check("backup replay rejected (one-time)", !replay.valid);
}

t.done("ekko:auth cybersec");
