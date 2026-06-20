// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { Database } from "ekko:db";
import { connect, defineTable, col } from "ekko:db/orm";
import { asserter } from "../_harness";

const t = asserter();

let denied = false;
try { connect("e2e/_dbtmp/_guard.db"); } catch (e) {
  denied = /PermissionError|access denied|denied/.test(String((e as any)?.message ?? e));
}
if (!denied) {
  console.log("\n✗ MISCONFIGURED — orm-permissions.e2e.ts must run WITHOUT --allow=fs.");
  console.log("ASSERTIONS 0 1");
  Ekko.exit(1);
}

t.group("ORM file open denied without --allow=fs (inherits ekko:db gate)");
t.denied("connect(path-string) denied", () => connect("e2e/_dbtmp/x.db"));
t.denied("connect('sqlite',{path}) denied", () => connect("sqlite", { path: "e2e/_dbtmp/x.db" }));
t.denied("connect({path}) denied", () => connect({ path: "e2e/_dbtmp/x.db" } as any));
t.denied("connect(Database(file)) denied", () => connect(Database("e2e/_dbtmp/x.db")));

t.group(":memory: ORM is exempt (no disk)");
let mem: any = null;
t.notThrows("connect(Database(':memory:')) allowed", () => { mem = connect(Database(":memory:")); });
t.notThrows("connect(':memory:') string allowed", () => { connect(":memory:").close(); });
t.notThrows(":memory: DDL/DML works", () => {
  const U = defineTable("users", { id: col.int().primaryKey().autoIncrement(), name: col.text(), email: col.text() });
  mem.createTable(U);
  mem.from(U).insert({ name: "Alice", email: "a@x.io" }).exec();
  mem.from(U).insert({ name: "Bob", email: "b@x.io" }).exec();
});

t.group("injection-safety — values parameterized, never interpolated");
const Users = defineTable("users", { id: col.int().primaryKey().autoIncrement(), name: col.text(), email: col.text() });
const EVIL = "x'; DROP TABLE users; --";

const wsql = mem.from(Users).where((u: any) => u.name.eq(EVIL)).toSQL();
t.check("where toSQL has @p placeholder", wsql.includes("@p"));
t.check("where toSQL has NO raw DROP TABLE", !wsql.includes("DROP TABLE"));
t.deep("where param carries the literal", mem.from(Users).where((u: any) => u.name.eq(EVIL)).toCommand().params, { p0: EVIL });

t.check("object-where toSQL has NO raw DROP TABLE", !mem.from(Users).where({ name: EVIL }).toSQL().includes("DROP TABLE"));

t.eq("evil where matches 0 rows", mem.from(Users).where((u: any) => u.name.eq(EVIL)).toArray().length, 0);
t.eq("table survived evil where", mem.from(Users).count(), 2);

t.check("insert toSQL has NO raw DROP TABLE", !mem.from(Users).insert({ name: EVIL, email: "z@x.io" }).toSQL().includes("DROP TABLE"));
mem.from(Users).insert({ name: EVIL, email: "evil@x.io" }).exec();
t.eq("table survived evil insert", mem.from(Users).count(), 3);
t.eq("evil stored as literal", mem.from(Users).where((u: any) => u.email.eq("evil@x.io")).first().name, EVIL);
mem.close();

t.done("ekko:db/orm cybersec");
