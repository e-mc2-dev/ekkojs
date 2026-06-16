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
import { asserter } from "../_harness.ts";

const t = asserter();

const Users = defineTable("users", {
  id: col.int().primaryKey().autoIncrement(),
  name: col.text(),
  age: col.int().nullable(),
});

const db = connect(Database(":memory:"));
db.createTable(Users);
db.from(Users).insert({ name: "Alice", age: 30 }).exec();
db.from(Users).insert({ name: "Bob", age: 25 }).exec();
db.from(Users).insert({ name: "Charlie", age: 35 }).exec();
db.from(Users).insert({ name: "Diana", age: 28 }).exec();
db.from(Users).insert({ name: "Eve", age: 40 }).exec();

const GUARD = /SQL-injection guard|invalid column identifier|non-negative integer/;

t.group("orderBy injection guards");
t.throws("orderBy field with SQL payload",
  () => db.from(Users).orderBy("age; DROP TABLE users--").toArray(), GUARD);
t.throws("orderBy field with subquery",
  () => db.from(Users).orderBy("(SELECT 1)").toArray(), GUARD);
t.throws("orderBy field with space/expr",
  () => db.from(Users).orderBy("age, (CASE WHEN 1=1 THEN 1 ELSE 2 END)").toArray(), GUARD);
t.throws("orderBy field with quote",
  () => db.from(Users).orderBy("name'--").toArray(), GUARD);
t.throws("orderBy field non-string",
  () => db.from(Users).orderBy(1 as any).toArray(), GUARD);

t.notThrows("orderBy malicious dir coerces to ASC (no injection)",
  () => db.from(Users).orderBy("age", "ASC; DROP TABLE users--").toArray());
{
  const sql = db.from(Users).orderBy("age", "ASC; DROP TABLE users--").toSQL();
  t.check("coerced dir not in SQL", !sql.includes("DROP"));
  t.check("coerced dir is ASC", /ORDER BY age ASC/.test(sql));
}

t.group("take/skip injection guards");
t.throws("take string payload",
  () => db.from(Users).take("1; DROP TABLE users--" as any).toArray(), GUARD);
t.throws("take float",
  () => db.from(Users).take(1.5 as any).toArray(), GUARD);
t.throws("take negative",
  () => db.from(Users).take(-1 as any).toArray(), GUARD);
t.throws("take NaN",
  () => db.from(Users).take("abc" as any).toArray(), GUARD);
t.throws("skip string payload",
  () => db.from(Users).skip("0 UNION SELECT password--" as any).toArray(), GUARD);
t.throws("skip negative",
  () => db.from(Users).skip(-5 as any).toArray(), GUARD);

t.group("groupBy injection guards");
t.throws("groupBy payload",
  () => db.from(Users).select("age", "COUNT(*) AS c").groupBy("age); DROP TABLE users--").toArray(), GUARD);
t.throws("groupBy expr",
  () => db.from(Users).select("age", "COUNT(*) AS c").groupBy("age, (SELECT 1)").toArray(), GUARD);

t.group("legit table-qualified identifier");
t.notThrows("orderBy users.age", () => db.from(Users).orderBy("users.age").toArray());

t.group("legit queries unaffected");
t.eq("orderBy ASC works", db.from(Users).orderBy("age").toArray()[0].name, "Bob");
t.eq("orderByDesc works", db.from(Users).orderByDesc("age").toArray()[0].name, "Eve");
t.eq("orderBy proxy works", db.from(Users).orderBy((u: any) => u.age).toArray()[0].name, "Bob");
t.eq("take(2) works", db.from(Users).take(2).toArray().length, 2);
t.eq("skip(3) works", db.from(Users).take(100).skip(3).toArray().length, 2);
t.eq("take(0) works", db.from(Users).take(0).toArray().length, 0);
t.eq("groupBy works", db.from(Users).select("age", "COUNT(*) AS c").groupBy("age").toArray().length, 5);

t.eq("table not dropped — still 5 rows", db.from(Users).count(), 5);

db.close();
t.done("ekko:db/orm SQL-injection guards");
