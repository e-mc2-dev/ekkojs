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
import { connect, defineTable, col, SqliteClient } from "ekko:db/orm";
import { exists, remove } from "ekko:fs";
import { asserter } from "../_harness.ts";

const t = asserter();
function rm(p: string) { for (const s of [p, p + "-wal", p + "-shm"]) { try { if (exists(s)) remove(s); } catch {  } } }

t.group("where({field:null}) → IS NULL (was = NULL, 0 rows)");
{
  const db = connect(Database(":memory:"));
  const T = defineTable("t", { id: col.int().primaryKey().autoIncrement(), v: col.text().nullable(), k: col.int().nullable() });
  db.createTable(T);
  db.from(T).insert({ v: null, k: 1 }).exec();
  db.from(T).insert({ v: "x", k: null }).exec();
  t.eq("where null matches the NULL row", db.from(T).where({ v: null }).toArray().length, 1);
  t.check("where null SQL uses IS NULL", db.from(T).where({ v: null }).toSQL().includes("IS NULL"));
  t.check("where null SQL has no '= @' for null", !/v\s*=\s*@/.test(db.from(T).where({ v: null }).toSQL()));
  t.eq("mixed where {a,b:null} matches", db.from(T).where({ v: "x", k: null }).toArray().length, 1);
  t.check("mixed SQL: eq param AND IS NULL", /=\s*@p0\s+AND.+IS NULL/.test(db.from(T).where({ v: "x", k: null }).toSQL()));
  
  t.eq("proxy isNull still works", db.from(T).where((x: any) => x.v.isNull()).toArray().length, 1);
  db.close();
}

t.group("connect-by-path + scoped __ekko_db_open (was 'not a function')");
{
  const FP = "e2e/_dbtmp/rc.db"; rm(FP);
  const byPath = connect(FP);
  byPath.exec("CREATE TABLE a (x INT)"); byPath.exec("INSERT INTO a VALUES (7)");
  t.eq("connect(path) round-trip", byPath.query("SELECT x FROM a").rows[0][0], 7);
  byPath.close();
  const byDriver = connect("sqlite", { path: ":memory:" });
  byDriver.exec("CREATE TABLE b (x INT)"); byDriver.exec("INSERT INTO b VALUES (8)");
  t.eq("connect('sqlite',{path}) round-trip", byDriver.query("SELECT x FROM b").rows[0][0], 8);
  byDriver.close();
  const byObj = connect({ path: ":memory:" } as any);
  byObj.exec("CREATE TABLE c (x INT)"); byObj.exec("INSERT INTO c VALUES (9)");
  t.eq("connect({path}) round-trip", byObj.query("SELECT x FROM c").rows[0][0], 9);
  byObj.close();
  const sc = new (SqliteClient as any)(":memory:");
  sc.exec("CREATE TABLE d (x INT)"); sc.exec("INSERT INTO d VALUES (10)");
  t.eq("new SqliteClient(':memory:') round-trip", sc.query("SELECT x FROM d").rows[0][0], 10);
  sc.close();
  
  t.eq("__ekko_db_open is NOT a global", typeof (globalThis as any).__ekko_db_open, "undefined");
  rm(FP);
}

t.group("pool — independent over file, pool.close() never kills parent");
{
  const FP = "e2e/_dbtmp/pool.db"; rm(FP);
  const db = connect(FP);
  db.exec("CREATE TABLE p (x INT)");
  const pool = (db as any).createPool({ min: 2, max: 4 });
  t.deep("pool.stats() shape", pool.stats(), { total: 2, available: 2, busy: 0 });
  pool.execute("INSERT INTO p VALUES (1)");
  pool.execute("INSERT INTO p VALUES (2)");
  t.eq("pool query sees committed rows", pool.query("SELECT count(*) AS c FROM p").rows[0][0], 2);
  pool.close();
  
  t.notThrows("parent db alive after pool.close()", () => db.exec("INSERT INTO p VALUES (3)"));
  t.eq("parent still queryable", db.query("SELECT count(*) FROM p").rows[0][0], 3);
  db.close();
  rm(FP);
}
t.group("pool over Database-object — pool.close() leaves borrowed parent alive");
{
  const db = connect(Database(":memory:"));
  db.exec("CREATE TABLE p (x INT)"); db.exec("INSERT INTO p VALUES (1)");
  const pool = (db as any).createPool({ min: 2, max: 4 });
  pool.close();
  t.notThrows("borrowed parent alive after pool.close()", () => db.query("SELECT count(*) FROM p"));
  t.eq("borrowed parent data intact", db.query("SELECT count(*) FROM p").rows[0][0], 1);
  db.close();
}

t.group("value gotchas — bool 0/1, json string, empty aggregates");
{
  const db = connect(Database(":memory:"));
  const T = defineTable("t", { id: col.int().primaryKey().autoIncrement(), active: col.bool().default(true), meta: col.json().nullable(), score: col.real() });
  db.createTable(T);
  db.from(T).insert({ active: true, meta: { a: 1 }, score: 1.5 }).exec();
  db.from(T).insert({ active: false, meta: null, score: 2.5 }).exec();
  const r = db.from(T).first();
  t.eq("col.bool reads back as 0/1 number", typeof r.active, "number");
  t.eq("col.bool true → 1", r.active, 1);
  t.eq("col.json reads back as string (not parsed)", typeof r.meta, "string");
  t.eq("col.json content", r.meta, JSON.stringify({ a: 1 }));
  const empty = db.from(T).where((x: any) => x.id.eq(999));
  t.eq("sum over empty → null", empty.sum("score"), null);
  t.eq("avg over empty → null", empty.avg("score"), null);
  t.eq("max over empty → null", empty.max("score"), null);
  t.eq("count over empty → 0", empty.count(), 0);
  db.close();
}

t.group("relations / terminals / update-all");
{
  const db = connect(Database(":memory:"));
  const A = defineTable("a", { id: col.int().primaryKey().autoIncrement(), name: col.text() });
  const B = defineTable("b", { id: col.int().primaryKey().autoIncrement(), a_id: col.int() });
  t.type("hasMany is fn", (A as any).hasMany, "function");
  t.type("hasOne is fn", (A as any).hasOne, "function");
  t.type("belongsTo is fn", (B as any).belongsTo, "function");
  t.type("manyToMany is fn", (A as any).manyToMany, "function");
  A.hasMany(B, { foreignKey: "a_id" });
  db.createTable(A); db.createTable(B);
  db.from(A).insert({ name: "x" }).exec();
  db.from(A).insert({ name: "y" }).exec();
  const withChildren = db.from(A).include((u: any) => u.b).toArray();
  t.check("include over no children → empty array", Array.isArray(withChildren[0].b) && withChildren[0].b.length === 0);
  const q = db.from(A).where((x: any) => x.id.eq(1));
  t.type("toPlan is fn", (q as any).toPlan, "function");
  t.type("toCommand is fn", (q as any).toCommand, "function");
  db.from(A).update({ name: "z" }).exec();   
  t.deep("update-all set every row", db.from(A).toArray().map((r: any) => r.name), ["z", "z"]);
  db.from(A).delete().exec();                  
  t.eq("delete-all empties table", db.from(A).count(), 0);
  db.close();
}

t.done("ekko:db/orm recheck");
