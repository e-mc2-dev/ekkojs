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
import { asserter } from "../_harness.ts";

const t = asserter();

let denied = false;
try { new Database("e2e/_dbtmp/_guard.db"); } catch (e) {
  denied = /PermissionError|access denied|denied/.test(String((e as any)?.message ?? e));
}
if (!denied) {
  console.log("");
  console.log("✗ MISCONFIGURED — db-permissions.e2e.ts must run WITHOUT --allow=fs:");
  console.log("      ekko run e2e/db/db-permissions.e2e.ts        (no --allow)");
  console.log("  opening a file db was ALLOWED → you granted `fs`.");
  console.log("ASSERTIONS 0 1");
  Ekko.exit(1);
}

t.group("file-backed open denied without --allow=fs (the bypass fix)");
t.denied("relative path denied", () => new Database("e2e/_dbtmp/x.db"));
t.denied("bare filename denied", () => new Database("pwned.db"));
t.denied("absolute path denied", () => new Database("/tmp/evil.db"));
t.denied("windows-abs path denied", () => new Database("C:/Windows/Temp/evil.db"));
t.denied("traversal path denied", () => new Database("../../etc/evil.db"));
t.denied("nested-new-dir denied", () => new Database("e2e/_dbtmp/sub/deep/new.db"));

t.group(":memory: is exempt (ephemeral, no disk)");
let mem: any = null;
t.notThrows(":memory: open allowed without fs", () => { mem = new Database(":memory:"); });
t.notThrows(":memory: DDL/DML works", () => { mem.exec("CREATE TABLE t(x)"); mem.exec("INSERT INTO t VALUES (1)"); });
t.eq(":memory: query works", mem.query("SELECT x FROM t").rows[0][0], 1);

t.group("SQL-level filesystem escapes contained from a permission-free :memory: db");

t.throws("ATTACH external file denied", () => mem.exec("ATTACH DATABASE 'e2e/_dbtmp/evil.db' AS evil"), /auth|denied|not authorized/i);
t.throws("ATTACH absolute denied", () => mem.exec("ATTACH DATABASE '/tmp/evil2.db' AS e2"), /auth|denied|not authorized/i);

t.throws("VACUUM INTO denied", () => mem.exec("VACUUM main INTO 'e2e/_dbtmp/vac.db'"), /auth|denied|not authorized/i);

t.throws("load_extension denied", () => mem.query("SELECT load_extension('/x.so')"), /auth|denied|not authorized|no such function/i);

t.notThrows("ATTACH ':memory:' allowed", () => mem.exec("ATTACH DATABASE ':memory:' AS m2"));
t.notThrows("ATTACH '' temp allowed", () => mem.exec("ATTACH DATABASE '' AS tmpdb"));
mem.close();

t.done("ekko:db security/permission");
