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
import { createRBAC, matchPerm } from "ekko:auth/rbac";
import { asserter } from "../_harness.ts";

const t = asserter();
function rb() { const db = connect(":memory:"); const r = createRBAC({ db }); r.initialize(); return r; }

t.group("role CRUD");
{
  const r = rb();
  r.createRole("editor", { description: "Editors" });
  t.eq("getRole", r.getRole("editor").name, "editor");
  r.createRole("viewer");
  t.eq("listRoles count", r.listRoles().length, 2);
  r.deleteRole("viewer");
  t.check("deleted role gone", !r.getRole("viewer"));
  r.createRole("sys", { isSystem: true });
  t.throws("cannot delete system role", () => r.deleteRole("sys"), /system role/);
}

t.group("group CRUD + hierarchy");
{
  const r = rb();
  r.createGroup("eng"); r.createGroup("backend", { parent: "eng" });
  t.eq("listGroups", r.listGroups().length, 2);
  const h = r.getGroupHierarchy("backend");
  t.eq("hierarchy includes self + parent", h.length, 2);
  t.eq("hierarchy[0] is self", h[0].name, "backend");
  t.throws("unknown parent throws", () => r.createGroup("x", { parent: "nope" }), /Parent group not found/);
}

t.group("permission CRUD");
{
  const r = rb();
  r.definePermission("posts", "read", "Read posts");
  t.eq("listPermissions", r.listPermissions().length, 1);
  r.definePermission("posts", "read"); 
  t.eq("define idempotent", r.listPermissions().length, 1);
  r.removePermission("posts", "read");
  t.eq("removed", r.listPermissions().length, 0);
}

t.group("role↔perm + user↔role + can");
{
  const r = rb();
  r.createRole("editor"); r.grant("editor", "posts", "write"); r.grant("editor", "posts", "read");
  r.assignRole("u1", "editor");
  t.check("can write (role grant)", r.can("u1", "posts", "write"));
  t.check("can read (role grant)", r.can("u1", "posts", "read"));
  t.check("cannot delete (no grant)", r.cannot("u1", "posts", "delete"));
  t.deep("getUserRoles", r.getUserRoles("u1").map((x: any) => x.name), ["editor"]);
  r.revokeFromRole("editor", "posts", "write");
  t.check("revoked write", r.cannot("u1", "posts", "write"));
  r.revokeRole("u1", "editor");
  t.check("after role revoke, cannot read", r.cannot("u1", "posts", "read"));
}

t.group("group→role inheritance");
{
  const r = rb();
  r.createRole("mod"); r.grant("mod", "comments", "moderate");
  r.createGroup("mods"); r.assignGroupRole("mods", "mod");
  r.addToGroup("u2", "mods");
  t.check("user gets perm via group→role", r.can("u2", "comments", "moderate"));
  t.deep("getUserGroups", r.getUserGroups("u2").map((x: any) => x.name), ["mods"]);
}

t.group("user + group overrides");
{
  const r = rb();
  r.grantUser("u3", "billing", "view");
  t.check("direct user grant", r.can("u3", "billing", "view"));
  r.revokeUserPermission("u3", "billing", "view");
  t.check("revoked user grant", r.cannot("u3", "billing", "view"));
  r.createGroup("finance"); r.grantGroup("finance", "billing", "edit"); r.addToGroup("u3", "finance");
  t.check("group grant", r.can("u3", "billing", "edit"));
}

t.group("resolve + claims + matchPerm");
{
  const r = rb();
  r.createRole("admin"); r.grant("admin", "users", "read"); r.deny("admin", "users", "delete");
  r.assignRole("u4", "admin");
  const res = r.resolve("u4");
  t.check("resolve roles includes admin", res.roles.indexOf("admin") >= 0);
  t.check("resolve grants includes users:read", res.grants.indexOf("users:read") >= 0);
  t.check("resolve denies includes users:delete", res.denies.indexOf("users:delete") >= 0);
  const c = r.claimsFromUser("u4");
  t.check("claims has roles+grants+denies", !!c.roles && !!c.grants && !!c.denies);
  t.check("matchPerm exact", matchPerm("posts:read", "posts", "read"));
  t.check("matchPerm wildcard action", matchPerm("posts:*", "posts", "write"));
  t.check("matchPerm wildcard both", matchPerm("*:*", "a", "b"));
  t.check("matchPerm mismatch", !matchPerm("posts:read", "comments", "read"));
}

t.done("ekko:auth/rbac covered");
