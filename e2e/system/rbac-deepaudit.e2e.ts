// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { connect } from "ekko:db/orm";
import { createRBAC } from "ekko:auth/rbac";
import { asserter } from "../_harness.ts";

const t = asserter();
function rb(): any { const db = connect(":memory:"); const r = createRBAC({ db }); r.initialize(); return r; }

const PROTO_KEYS = ["__proto__", "constructor", "prototype", "toString", "hasOwnProperty", "valueOf", "isPrototypeOf"];

t.group("prototype-key principals DENY (never throw) — can()");
{
  const r = rb(); r.createRole("role"); r.grant("role", "x", "read"); r.assignRole("alice", "role");
  for (const u of PROTO_KEYS) {
    let threw = false, val: any = null;
    try { val = r.can(u, "x", "read"); } catch { threw = true; }
    t.check("can('" + u + "') did not throw", !threw);
    t.eq("can('" + u + "') === false (deny-by-default)", val, false);
  }
  t.check("legit user still allowed", r.can("alice", "x", "read") === true);
}

t.group("prototype-key principals — resolve()/cannot()/middleware never throw");
{
  const r = rb(); r.createRole("role"); r.grant("role", "x", "read"); r.assignRole("alice", "role");
  for (const u of ["__proto__", "constructor", "toString"]) {
    let threw = false, res: any = null;
    try { res = r.resolve(u); } catch { threw = true; }
    t.check("resolve('" + u + "') did not throw", !threw);
    t.check("resolve('" + u + "').grants is empty", !!res && Array.isArray(res.grants) && res.grants.length === 0);
    t.check("cannot('" + u + "') === true", r.cannot(u, "x", "read") === true);
  }
  
  const mk = (user: any) => { const res: any = { _c: 0, status(c: number) { this._c = c; return this; }, json() { return this; } }; return { req: { user }, res }; };
  let threw = false; const m = mk({ username: "__proto__" });
  try { r.middleware("x", "read")(m.req, m.res, () => {}); } catch { threw = true; }
  t.check("middleware('__proto__') did not throw", !threw);
  t.eq("middleware('__proto__') → 403 (forbidden, not 500)", m.res._c, 403);
}

t.group("null-proto cache still stores prototype-key usernames as real data");
{

  const r = rb();
  r.grantUser("__proto__", "docs", "read");
  t.check("grantUser('__proto__') then can === true", r.can("__proto__", "docs", "read") === true);
  t.check("other proto-key user still denied (no cross-key pollution)", r.can("constructor", "docs", "read") === false);
  r.revokeUserPermission("__proto__", "docs", "read");
  t.check("revoke invalidates → denied", r.cannot("__proto__", "docs", "read") === true);
}

t.group("prototype-key resource/action names are safe");
{
  const r = rb(); r.createRole("role"); r.assignRole("alice", "role");
  let threw = false;
  try {
    r.grant("role", "__proto__", "constructor");
    t.check("can(alice,__proto__,constructor) granted", r.can("alice", "__proto__", "constructor") === true);
    t.check("unrelated still denied", r.can("alice", "toString", "valueOf") === false);
  } catch { threw = true; }
  t.check("proto-key resource/action did not throw", !threw);
}

t.group("regression — deny-wins + tier precedence + wildcard still hold");
{
  const r = rb(); r.createRole("role"); r.assignRole("u", "role");
  r.grant("role", "posts", "read"); r.deny("role", "posts", "*");
  t.check("deny resource:* wins over specific grant (same tier)", r.cannot("u", "posts", "read"));
  const r2 = rb(); r2.createRole("role"); r2.deny("role", "d", "r"); r2.assignRole("u", "role"); r2.grantUser("u", "d", "r");
  t.check("user grant overrides role deny (tier precedence)", r2.can("u", "d", "r"));
  const r3 = rb(); r3.createRole("super"); r3.grant("super", "*", "*"); r3.assignRole("u", "super");
  t.check("*:* grants anything", r3.can("u", "whatever", "anything"));
}

t.done("ekko:auth/rbac deep-audit (W4.2)");
