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
const auth = createAuth({ secret: "k" });

t.group("JWT claim edges");
{
  const noExp = auth.jwt.sign({ sub: "u" }); 
  const v = auth.jwt.verify(noExp) as any;
  t.check("no-exp token verifies", v && v.sub === "u");
  t.check("iat present", typeof v.iat === "number");
  const uni = auth.jwt.sign({ name: "Zoë 李 😀", data: { a: [1, 2, 3] } }, 3600);
  const vu = auth.jwt.verify(uni) as any;
  t.eq("unicode claim round-trips", vu.name, "Zoë 李 😀");
  t.deep("nested claim round-trips", vu.data, { a: [1, 2, 3] });
  t.eq("decode malformed → null", auth.jwt.decode("nope") as any, null);
}

t.group("password iteration floor + distinct salts");
{
  const h = auth.hashPassword("pw", { iterations: 1000 }); 
  t.check("iterations floored to >= 600000", parseInt(h.split(":")[1], 10) >= 600000);
  const a = auth.hashPassword("same"), b = auth.hashPassword("same");
  t.check("distinct salts → distinct hashes", a !== b);
  t.check("both verify", auth.verifyPassword("same", a) && auth.verifyPassword("same", b));
  
  const parts = h.split(":"); const tampered = parts[0] + ":999999:" + parts[2] + ":" + parts[3];
  t.check("tampered iteration count fails verify", !auth.verifyPassword("pw", tampered));
}

t.group("session TTL + destroy idempotency");
{
  const a = createAuth({ secret: "k", sessionTTL: 3600 });
  const id = a.store.create({ x: 1 });
  t.deep("get within TTL", a.store.get(id), { x: 1 });
  a.store.destroy(id); a.store.destroy(id);
  t.eq("destroy idempotent → null", a.store.get(id), null);
  t.eq("get unknown id → null", a.store.get("nope"), null);
}

t.group("secureCookies opt-in");
{
  const a = createAuth({ secret: "k", secureCookies: true });
  const setCookies: any[] = [];
  const res: any = { cookie(n: string, v: string, o: any) { setCookies.push(o); return this; } };
  const req: any = { cookies: {} };
  a.session(req, res, () => {});
  req.login({ id: "u" });
  t.check("login cookie marked secure when opted in", setCookies[0].secure === true);
  const b = createAuth({ secret: "k" }); 
  const sc: any[] = [];
  const res2: any = { cookie(n: string, v: string, o: any) { sc.push(o); return this; } };
  const req2: any = { cookies: {} };
  b.session(req2, res2, () => {});
  req2.login({ id: "u" });
  t.check("default not secure (dev http)", !sc[0].secure);
}

t.group("TOTP options");
{
  const s = totp.setup({ issuer: "T", account: "a" });
  const c8 = totp.generate({ secret: s.secret, digits: 8 });
  t.check("8-digit code", /^\d{8}$/.test(c8));
  const c = totp.generate({ secret: s.secret });
  t.check("window=0 strict accepts current", totp.verify({ secret: s.secret, token: c, window: 0 }).valid);
  
  const prev = totp.generate({ secret: s.secret, time: Math.floor(Date.now() / 1000) - 30 });
  const res0 = totp.verify({ secret: s.secret, token: prev, window: 0 });
  const res1 = totp.verify({ secret: s.secret, token: prev, window: 1 });
  t.check("window=1 accepts prev period", res1.valid || res0.valid); 
  t.check("base32 padding handled", totp.base32Decode(s.secret).length > 0);
}

t.done("ekko:auth recheck");
