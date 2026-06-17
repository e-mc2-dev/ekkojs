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

t.group("group hierarchy: nested inheritance + depth safety");
{
  const r = rb();
  r.createRole("base"); r.grant("base", "x", "read");
  r.createGroup("root"); r.assignGroupRole("root", "base");
  r.createGroup("mid", { parent: "root" });
  r.createGroup("leaf", { parent: "mid" });
  r.addToGroup("u", "leaf");
  t.check("perm inherited up the group chain", r.can("u", "x", "read"));
  const h = r.getGroupHierarchy("leaf");
  t.check("hierarchy depth >= 3", h.length >= 3);
}

t.group("cascade deletes leave no dangling grants");
{
  const r = rb();
  r.createRole("role"); r.grant("role", "y", "do"); r.assignRole("u", "role");
  t.check("granted via role", r.can("u", "y", "do"));
  r.deleteRole("role");
  t.check("after role delete, denied", r.cannot("u", "y", "do"));
  t.eq("user has no roles after delete", r.getUserRoles("u").length, 0);
}
{
  const r = rb();
  r.createGroup("g"); r.grantGroup("g", "z", "act"); r.addToGroup("u", "g");
  t.check("granted via group", r.can("u", "z", "act"));
  r.deleteGroup("g");
  t.check("after group delete, denied", r.cannot("u", "z", "act"));
}

t.group("idempotency + reparenting");
{
  const r = rb();
  r.createRole("role"); r.assignRole("u", "role"); r.assignRole("u", "role");
  t.eq("double assign → single role", r.getUserRoles("u").length, 1);
  r.createGroup("a"); r.createGroup("b", { parent: "a" }); r.createGroup("c", { parent: "b" });
  r.deleteGroup("b"); 
  const ch = r.getGroupHierarchy("c");
  t.check("child reparented to grandparent after parent delete", ch.some((g: any) => g.name === "a"));
}

t.group("resolve dedups + revoke paths");
{
  const r = rb();
  r.createRole("r1"); r.grant("r1", "p", "read"); r.assignRole("u", "r1");
  r.createGroup("g"); r.assignGroupRole("g", "r1"); r.addToGroup("u", "g"); 
  const res = r.resolve("u");
  t.eq("resolve dedups p:read", res.grants.filter((k: string) => k === "p:read").length, 1);
}
{
  const r = rb();
  r.createGroup("g"); r.createRole("role"); r.grant("role", "p", "x"); r.assignGroupRole("g", "role"); r.addToGroup("u", "g");
  t.check("via group→role", r.can("u", "p", "x"));
  r.revokeGroupRole("g", "role");
  t.check("after revokeGroupRole, denied", r.cannot("u", "p", "x"));
  r.removeFromGroup("u", "g");
  t.eq("removed from group", r.getUserGroups("u").length, 0);
}

t.group("group-level deny propagates to members");
{
  const r = rb();
  r.createRole("role"); r.grant("role", "doc", "read"); r.assignRole("u", "role");
  t.check("role grants read", r.can("u", "doc", "read"));
  r.createGroup("restricted"); r.denyGroup("restricted", "doc", "read"); r.addToGroup("u", "restricted");
  t.check("group deny (higher tier) overrides role grant", r.cannot("u", "doc", "read"));
}

t.done("ekko:auth/rbac recheck");
