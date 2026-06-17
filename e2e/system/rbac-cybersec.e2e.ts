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
import { asserter } from "../_harness";

const t = asserter();
function rb() { const db = connect(":memory:"); const r = createRBAC({ db }); r.initialize(); return r; }

t.group("BUG A — deny wins within a tier, deterministic across insertion order");
{
  function scenario(denyFirst: boolean) {
    const r = rb(); r.createRole("role"); r.assignRole("u", "role");
    if (denyFirst) { r.deny("role", "posts", "*"); r.grant("role", "posts", "read"); }
    else { r.grant("role", "posts", "read"); r.deny("role", "posts", "*"); }
    return r.can("u", "posts", "read");
  }
  t.check("grant-first → DENY (deny wins)", scenario(false) === false);
  t.check("deny-first → DENY (deny wins)", scenario(true) === false);
  t.check("decision is order-independent", scenario(false) === scenario(true));
}

t.group("deny-by-default");
{
  const r = rb(); r.createRole("empty"); r.assignRole("u", "empty");
  t.check("no matching perm → denied", r.cannot("u", "anything", "read"));
  t.check("unknown user → denied", r.cannot("ghost", "x", "y"));
}

t.group("tier precedence (user > group > role) as the exception mechanism");
{
  
  const r = rb(); r.createRole("role"); r.deny("role", "docs", "read"); r.assignRole("u", "role");
  t.check("role deny → denied", r.cannot("u", "docs", "read"));
  r.grantUser("u", "docs", "read");
  t.check("user grant overrides role deny", r.can("u", "docs", "read"));
}
{
  
  const r = rb(); r.createRole("role"); r.grant("role", "docs", "read"); r.assignRole("u", "role");
  t.check("role grant → allowed", r.can("u", "docs", "read"));
  r.denyUser("u", "docs", "read");
  t.check("user deny overrides role grant", r.cannot("u", "docs", "read"));
}
{
  
  const r = rb(); r.createRole("role"); r.deny("role", "x", "y"); r.assignRole("u", "role");
  r.createGroup("g"); r.grantGroup("g", "x", "y"); r.addToGroup("u", "g");
  t.check("group grant overrides role deny", r.can("u", "x", "y"));
}

t.group("wildcard scoping");
{
  const r = rb(); r.createRole("super"); r.grant("super", "*", "*"); r.assignRole("u", "super");
  t.check("*:* grants any resource:action", r.can("u", "anything", "whatever"));
  const r2 = rb(); r2.createRole("blk"); r2.grant("blk", "posts", "read"); r2.deny("blk", "posts", "*"); r2.assignRole("u", "blk");
  t.check("deny resource:* blocks even a specific grant (same tier)", r2.cannot("u", "posts", "read"));
  t.check("deny resource:* blocks other actions", r2.cannot("u", "posts", "write"));
}

t.group("middleware gates");
{
  const r = rb(); r.createRole("ed"); r.grant("ed", "posts", "edit"); r.assignRole("alice", "ed");
  function mk(user: any) { const res: any = { _c: 0, status(c: number) { this._c = c; return this; }, json() { return this; } }; return { req: { user }, res }; }
  let n1 = false; const a = mk(null); r.middleware("posts", "edit")(a.req, a.res, () => { n1 = true; });
  t.eq("no user → 401", a.res._c, 401);
  let n2 = false; const b = mk({ username: "bob" }); r.middleware("posts", "edit")(b.req, b.res, () => { n2 = true; });
  t.eq("missing perm → 403", b.res._c, 403);
  let n3 = false; const c = mk({ username: "alice" }); r.middleware("posts", "edit")(c.req, c.res, () => { n3 = true; });
  t.check("has perm → next", n3);
  
  let n4 = false; const d = mk({ username: "alice" }); r.middlewareAny("posts", ["delete", "edit"])(d.req, d.res, () => { n4 = true; });
  t.check("middlewareAny passes if any", n4);
  let n5 = false; const e = mk({ username: "alice" }); r.middlewareAll("posts", ["edit", "delete"])(e.req, e.res, () => { n5 = true; });
  t.check("middlewareAll blocks if missing one", !n5 && e.res._c === 403);
}

t.group("cache invalidation after policy change");
{
  const r = rb(); r.createRole("role"); r.grant("role", "x", "read"); r.assignRole("u", "role");
  t.check("initially allowed (caches)", r.can("u", "x", "read"));
  r.denyUser("u", "x", "read"); 
  t.check("deny takes effect after invalidation", r.cannot("u", "x", "read"));
}

t.done("ekko:auth/rbac cybersec");
