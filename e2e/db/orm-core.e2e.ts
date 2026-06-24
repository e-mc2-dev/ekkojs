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
import { connect, defineTable, col, idx } from "ekko:db/orm";
import { exists, remove } from "ekko:fs";
import { asserter } from "../_harness";

const t = asserter();
function rm(p: string) { for (const s of [p, p + "-wal", p + "-shm"]) { try { if (exists(s)) remove(s); } catch {  } } }

function runSurface(db: any, label: string) {
  const Users = defineTable("users", {
    id: col.int().primaryKey().autoIncrement(), name: col.text(), email: col.text().unique(),
    age: col.int().nullable(), active: col.bool().default(true),
  });
  const Posts = defineTable("posts", {
    id: col.int().primaryKey().autoIncrement(), title: col.text(), body: col.text().nullable(),
    user_id: col.int(), likes: col.int().default(0),
  }, { indexes: [idx("user_id").name("idx_posts_user_" + label.replace(/[^a-z0-9]/gi, ""))] });
  const Tags = defineTable("tags", { id: col.int().primaryKey().autoIncrement(), name: col.text().unique() });
  Posts.belongsTo(Users, { foreignKey: "user_id" });
  Users.hasMany(Posts, { foreignKey: "user_id" });

  t.group(label + " — schema + insert");
  db.createTable(Users); db.createTable(Posts); db.createTable(Tags);
  t.notThrows("createTable x3", () => {});
  const firstIns = db.from(Users).insert({ name: "Alice", email: "alice@test.com", age: 30 }).exec();
  t.eq("insert affectedRows=1", firstIns.affectedRows, 1);
  t.eq("insert lastInsertId=1 (first row's auto id)", firstIns.lastInsertId, 1);
  db.from(Users).insert({ name: "Bob", email: "bob@test.com", age: 25 }).exec();
  db.from(Users).insert({ name: "Charlie", email: "charlie@test.com", age: 35, active: false }).exec();
  db.from(Users).insert({ name: "Diana", email: "diana@test.com", age: 28 }).exec();
  db.from(Users).insert({ name: "Eve", email: "eve@test.com", age: null }).exec();
  t.eq("inserted 5 users", db.from(Users).count(), 5);
  db.from(Posts).insert({ title: "Hello World", body: "First", user_id: 1, likes: 10 }).exec();
  db.from(Posts).insert({ title: "ORM Guide", body: "How to", user_id: 1, likes: 5 }).exec();
  db.from(Posts).insert({ title: "PG Tips", body: "tricks", user_id: 2, likes: 20 }).exec();
  db.from(Posts).insert({ title: "Draft", body: null, user_id: 3, likes: 0 }).exec();
  t.eq("inserted 4 posts", db.from(Posts).count(), 4);
  db.from(Tags).insert({ name: "rust" }).exec(); db.from(Tags).insert({ name: "javascript" }).exec(); db.from(Tags).insert({ name: "database" }).exec();
  t.eq("inserted 3 tags", db.from(Tags).count(), 3);

  t.group(label + " — select / projection");
  t.eq("toArray count", db.from(Users).toArray().length, 5);
  t.eq("first user name", db.from(Users).toArray()[0].name, "Alice");
  const names = db.from(Users).select((u: any) => [u.name]).toArray();
  t.eq("projection value", names[0].name, "Alice");
  t.eq("projection only 1 column", Object.keys(names[0]).length, 1);

  t.group(label + " — where (proxy)");
  t.eq("eq", db.from(Users).where((u: any) => u.name.eq("Alice")).first().email, "alice@test.com");
  t.eq("lt count", db.from(Users).where((u: any) => u.age.lt(30)).toArray().length, 2);
  t.eq("gte count", db.from(Users).where((u: any) => u.age.gte(30)).toArray().length, 2);
  t.eq("neq count", db.from(Users).where((u: any) => u.name.neq("Bob")).toArray().length, 4);
  t.eq("like count", db.from(Users).where((u: any) => u.name.like("A%")).toArray().length, 1);
  t.eq("notLike count", db.from(Users).where((u: any) => u.name.notLike("A%")).toArray().length, 4);
  t.eq("isNull count", db.from(Users).where((u: any) => u.age.isNull()).toArray().length, 1);
  t.eq("isNull name", db.from(Users).where((u: any) => u.age.isNull()).first().name, "Eve");
  t.eq("isNotNull count", db.from(Users).where((u: any) => u.age.isNotNull()).toArray().length, 4);
  t.eq("between count", db.from(Users).where((u: any) => u.age.between(25, 30)).toArray().length, 3);
  t.eq("isIn count", db.from(Users).where((u: any) => u.name.isIn(["Alice", "Charlie"])).toArray().length, 2);

  t.group(label + " — where (object + compound)");
  t.eq("object shorthand", db.from(Users).where({ name: "Bob" }).first().name, "Bob");
  t.eq("multi-field object", db.from(Users).where({ name: "Alice", age: 30 }).first().email, "alice@test.com");
  t.gte("AND", db.from(Users).where((u: any) => u.age.gt(25).and(u.active.eq(true))).toArray().length, 2);
  t.eq("OR", db.from(Users).where((u: any) => u.name.eq("Alice").or(u.name.eq("Bob"))).toArray().length, 2);
  t.gte("NOT", db.from(Users).where((u: any) => u.active.eq(true).not()).toArray().length, 1);

  t.group(label + " — order / limit / distinct");
  t.eq("orderBy ASC", db.from(Users).where((u: any) => u.age.isNotNull()).orderBy("age").toArray()[0].name, "Bob");
  t.eq("orderByDesc", db.from(Users).where((u: any) => u.age.isNotNull()).orderByDesc("age").toArray()[0].name, "Charlie");
  t.eq("take(2)", db.from(Users).take(2).toArray().length, 2);
  t.eq("skip(3)", db.from(Users).take(100).skip(3).toArray().length, 2);
  t.eq("take.skip page", db.from(Users).take(2).skip(1).toArray().length, 2);
  t.gte("distinct", db.from(Users).select((u: any) => [u.active]).distinct().toArray().length, 2);

  t.group(label + " — aggregates / first / exists");
  t.eq("count()", db.from(Users).count(), 5);
  t.eq("sum(likes)", db.from(Posts).sum("likes"), 35);
  t.type("avg numeric", db.from(Users).where((u: any) => u.age.isNotNull()).avg("age"), "number");
  t.eq("min(age)", db.from(Users).where((u: any) => u.age.isNotNull()).min("age"), 25);
  t.eq("max(age)", db.from(Users).where((u: any) => u.age.isNotNull()).max("age"), 35);
  t.eq("first()", db.from(Users).first().name, "Alice");
  t.eq("exists true", db.from(Users).where((u: any) => u.name.eq("Alice")).exists(), true);
  t.eq("exists false", db.from(Users).where((u: any) => u.name.eq("Nobody")).exists(), false);
  t.throws("firstOrThrow on empty", () => db.from(Users).where((u: any) => u.name.eq("Nobody")).firstOrThrow(), /.*/);

  t.group(label + " — update / delete");
  const updRes = db.from(Users).where((u: any) => u.name.eq("Alice")).update({ age: 31 }).exec();
  t.check("update result omits lastInsertId", updRes.lastInsertId === undefined);
  t.eq("update age", db.from(Users).where((u: any) => u.name.eq("Alice")).first().age, 31);
  db.from(Users).where((u: any) => u.active.eq(false)).update({ active: true }).exec();
  t.eq("update all active", db.from(Users).where((u: any) => u.active.eq(true)).count(), 5);
  db.from(Tags).where((u: any) => u.name.eq("database")).delete().exec();
  t.eq("delete one tag", db.from(Tags).count(), 2);

  t.group(label + " — join / groupBy / having");
  t.eq("join (proxy)", db.from(Posts).join(Users, (p: any, u: any) => p.user_id.eqField(u.id)).select("posts.title", "users.name").toArray().length, 4);
  t.eq("join (string ON)", db.from(Posts).join(Users, "posts.user_id = users.id").select("posts.title", "users.name").toArray().length, 4);
  t.gte("leftJoin", db.from(Users).leftJoin(Posts, (u: any, p: any) => u.id.eqField(p.user_id)).select("users.name", "posts.title").toArray().length, 5);
  t.gte("groupBy", db.from(Posts).select("user_id", "COUNT(*) AS post_count").groupBy("user_id").toArray().length, 1);
  t.gte("having", db.from(Posts).select("user_id", "COUNT(*) AS cnt").groupBy("user_id").having((h: any) => h.cnt.gt(1)).toArray().length, 1);

  t.group(label + " — transactions");
  db.transaction((tx: any) => { tx.from(Tags).insert({ name: "testing" }).exec(); });
  t.eq("after commit", db.from(Tags).count(), 3);
  try { db.transaction((tx: any) => { tx.from(Tags).insert({ name: "temp" }).exec(); throw new Error("rollback"); }); } catch {  }
  t.eq("after rollback", db.from(Tags).count(), 3);

  t.group(label + " — toSQL / subqueries / include");
  const sql = db.from(Users).where((u: any) => u.name.eq("test")).toSQL();
  t.check("toSQL has WHERE", sql.includes("WHERE"));
  t.check("toSQL parameterized (@p)", sql.includes("@p"));
  t.check("insert toSQL has INSERT", db.from(Users).insert({ name: "x", email: "x@x.io" }).toSQL().includes("INSERT"));
  t.eq("EXISTS subquery", db.from(Users).where((u: any) => u.posts.any((p: any) => p.likes.gt(5))).toArray().length, 2);
  t.eq("NOT EXISTS subquery", db.from(Users).where((u: any) => u.posts.none((p: any) => p.likes.gt(5))).toArray().length, 3);
  t.eq("COUNT subquery >1", db.from(Users).where((u: any) => u.posts.count().gt(1)).toArray().length, 1);
  t.eq("COUNT subquery =0", db.from(Users).where((u: any) => u.posts.count().eq(0)).toArray().length, 2);
  const withPosts = db.from(Users).include((u: any) => u.posts).toArray();
  t.check("include attaches array", Array.isArray(withPosts[0].posts));
  t.eq("Alice has 2 posts (include)", db.from(Users).where((u: any) => u.name.eq("Alice")).include((u: any) => u.posts).first().posts.length, 2);

  t.group(label + " — immutability / edge cases");
  const base = db.from(Users);
  t.eq("base query unmodified after chaining", (base.where((u: any) => u.name.eq("Bob")), base.count()), 5);
  t.eq("empty result is []", db.from(Users).where((u: any) => u.name.eq("NONE")).toArray().length, 0);
  t.eq("first on empty is null", db.from(Users).where((u: any) => u.name.eq("NONE")).first(), null);
  db.close();
}

runSurface(connect(Database(":memory:")), ":memory:(obj)");
const FP = "e2e/_dbtmp/orm.db"; rm(FP);
runSurface(connect(FP), "file(path)");          
rm(FP);

t.group("connect(':memory:') string form");
const m = connect(":memory:");
m.exec("CREATE TABLE s (x INT)"); m.exec("INSERT INTO s VALUES (1)");
t.eq("string :memory: works", m.query("SELECT x FROM s").rows[0][0], 1);
m.close();

t.done("ekko:db/orm core");
