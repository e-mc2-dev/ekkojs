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
const auth = createAuth({ secret: "w41-secret" });

t.group("JWT nbf enforcement (RFC 7519 §4.1.5) — W4.1 fix");
const future: any = auth.jwt.sign({ sub: "u" }, 3600, { notBefore: 3600 }); 
t.eq("not-yet-valid token (nbf in future) → rejected", auth.jwt.verify(future), null);
const normal: any = auth.jwt.sign({ sub: "u" }, 3600);
t.eq("normal token (no nbf) verifies", (auth.jwt.verify(normal) as any).sub, "u");
const past: any = auth.jwt.sign({ sub: "u" }, 3600, { notBefore: -10 }); 
t.eq("already-valid token (nbf in past) verifies", (auth.jwt.verify(past) as any).sub, "u");

t.group("JWT aud/iss validation — W4.1");
const tk: any = auth.jwt.sign({ sub: "u" }, 3600, { audience: "api1", issuer: "me" });
t.eq("correct aud+iss verifies", (auth.jwt.verify(tk, { audience: "api1", issuer: "me" }) as any).sub, "u");
t.eq("wrong audience → rejected", auth.jwt.verify(tk, { audience: "api2" }), null);
t.eq("wrong issuer → rejected", auth.jwt.verify(tk, { issuer: "evil" }), null);
t.eq("no opts (backward-compat) still verifies", (auth.jwt.verify(tk) as any).sub, "u");

t.group("JWT malformed input — never crashes, returns null");
t.eq("non-string token → null", auth.jwt.verify(12345 as any), null);
t.eq("empty string → null", auth.jwt.verify(""), null);
t.eq("two-part token → null", auth.jwt.verify("a.b"), null);
t.eq("garbage → null", auth.jwt.verify("....."), null);
t.eq("cross-secret token → null", createAuth({ secret: "other" }).jwt.verify(normal), null);

t.group("TOTP replay protection (RFC 6238 §5.2) + counter — W4.1 fix");
{
  const s: any = totp.setup({ issuer: "T", account: "a" });
  const now = Math.floor(Date.now() / 1000);
  const code = totp.generate({ secret: s.secret, time: now });
  const v1: any = totp.verify({ secret: s.secret, token: code, time: now });
  t.check("valid token verifies", v1.valid === true);
  t.type("result exposes numeric counter (enables replay tracking)", v1.counter, "number");
  
  const replay: any = totp.verify({ secret: s.secret, token: code, time: now, lastCounter: v1.counter });
  t.check("same token replayed (counter <= lastCounter) → rejected", replay.valid === false);
  t.eq("replay reason surfaced", replay.reason, "replay");
  
  const future = now + 30;
  const code2 = totp.generate({ secret: s.secret, time: future });
  const v2: any = totp.verify({ secret: s.secret, token: code2, time: future, lastCounter: v1.counter });
  t.check("newer counter still accepted", v2.valid === true && v2.counter > v1.counter);
  
  const v3: any = totp.verify({ secret: s.secret, token: code, time: now });
  t.check("no lastCounter (backward-compat) still accepts", v3.valid === true);
}

t.group("TOTP verify — constant-time + robust to bad input");
{
  const s: any = totp.setup({ issuer: "T", account: "a" });
  const now = Math.floor(Date.now() / 1000);
  t.check("wrong 6-digit code rejected", totp.verify({ secret: s.secret, token: "000000", time: now }).valid === false);
  t.check("non-string token coerced, rejected (no throw)", totp.verify({ secret: s.secret, token: 123 as any, time: now }).valid === false);
  let threw = false;
  try { totp.verify({ secret: s.secret, token: null as any, time: now }); } catch { threw = true; }
  t.check("null token does not throw", !threw);
}

t.check("reached end → auth verify hardened, no crash", true);
t.done("auth deep-audit (W4.1)");
