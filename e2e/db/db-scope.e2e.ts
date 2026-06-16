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
import { exists, remove } from "ekko:fs";
import { asserter } from "../_harness.ts";

const t = asserter();
function rm(p: string) { for (const s of [p, p + "-wal", p + "-shm"]) { try { if (exists(s)) remove(s); } catch {  } } }
const INS = "e2e/_dbtmp/scope.db";
rm(INS);

t.group("open scope — in-scope allowed, out-of-scope denied");
let db: any = null;
t.notThrows("in-scope file open allowed", () => { db = new Database(INS); });
t.notThrows("in-scope DDL", () => db.exec("CREATE TABLE t(x INT)"));
t.denied("out-of-scope file open denied", () => new Database("e2e/_other/nope.db"));
t.denied("out-of-scope absolute denied", () => new Database("/tmp/scope_evil.db"));
t.denied("traversal escapes scope → denied", () => new Database("e2e/_dbtmp/../_other/esc.db"));

t.group("ATTACH scope — authorizer enforces the same fs scope");
t.notThrows("ATTACH in-scope allowed", () => db.exec("ATTACH DATABASE 'e2e/_dbtmp/att_ok.db' AS aok"));
t.throws("ATTACH out-of-scope denied", () => db.exec("ATTACH DATABASE 'e2e/_other/att_bad.db' AS abad"), /auth|denied|not authorized/i);
t.throws("ATTACH absolute out-of-scope denied", () => db.exec("ATTACH DATABASE '/tmp/att_bad.db' AS abad2"), /auth|denied|not authorized/i);
t.throws("ATTACH traversal out-of-scope denied", () => db.exec("ATTACH DATABASE 'e2e/_dbtmp/../_other/att.db' AS atrav"), /auth|denied|not authorized/i);
t.notThrows("ATTACH ':memory:' always allowed", () => db.exec("ATTACH DATABASE ':memory:' AS amem"));

t.group("VACUUM INTO scope — authorizer enforces the same fs scope");
t.notThrows("VACUUM INTO in-scope allowed", () => db.exec("VACUUM main INTO 'e2e/_dbtmp/vac_ok.db'"));
t.throws("VACUUM INTO out-of-scope denied", () => db.exec("VACUUM main INTO 'e2e/_other/vac_bad.db'"), /auth|denied|not authorized/i);

db.close();
rm(INS);
rm("e2e/_dbtmp/att_ok.db");
rm("e2e/_dbtmp/vac_ok.db");
t.done("ekko:db cybersec scope");
