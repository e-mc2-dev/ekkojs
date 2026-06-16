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

type QR = { columns: string[]; rows: any[][] };
const objs = (r: QR): any[] =>
  r.rows.map((row) => { const o: any = {}; r.columns.forEach((c, i) => (o[c] = row[i])); return o; });
const scalar = (r: QR): any => (r.rows.length ? r.rows[0][0] : undefined);
function rm(p: string) { for (const s of [p, p + "-wal", p + "-shm"]) { try { if (exists(s)) remove(s); } catch {  } } }
const DBP = "e2e/_dbtmp/cov.db";
rm(DBP);

t.group("open / close / handle");
const db = new Database(DBP);
t.type("new Database returns object", db, "object");
t.type("_handle is a number", (db as any)._handle, "number");
t.type("exec is a function", (db as any).exec, "function");
t.type("query is a function", (db as any).query, "function");
t.type("prepare is a function", (db as any).prepare, "function");
const mem = Database(":memory:");                 
t.type(":memory: via call returns object", mem, "object");
t.ne("file and memory handles differ", (db as any)._handle, (mem as any)._handle);
mem.close();
t.notThrows("close() on memory db", () => mem.close());  

t.group("DDL — create / index / alter / drop");
t.notThrows("DROP TABLE IF EXISTS (no table)", () => db.exec("DROP TABLE IF EXISTS users"));
db.exec(`CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  age INTEGER,
  score REAL DEFAULT 0.0,
  active INTEGER DEFAULT 1,
  created TEXT DEFAULT CURRENT_TIMESTAMP
)`);
t.check("users table exists", scalar(db.query("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='users'")) === 1);
db.exec("CREATE INDEX IF NOT EXISTS idx_email ON users (email)");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_name ON users (name)");
t.check("two indexes created", scalar(db.query("SELECT count(*) FROM sqlite_master WHERE type='index' AND tbl_name='users' AND name IN ('idx_email','idx_name')")) === 2);
db.exec("CREATE TABLE composite (a INT, b INT, val TEXT, PRIMARY KEY (a, b))");
db.exec("INSERT INTO composite VALUES (1,1,'x'),(1,2,'y')");
t.throws("composite PK rejects dup", () => db.exec("INSERT INTO composite VALUES (1,1,'z')"), /db:|UNIQUE|PRIMARY/);
db.exec("ALTER TABLE users ADD COLUMN nickname TEXT");
t.check("ADD COLUMN nickname", objs(db.query("SELECT * FROM users LIMIT 0")).length === 0 && db.query("SELECT nickname FROM users").columns[0] === "nickname");
db.exec("CREATE TABLE renameme (x INT)");
db.exec("ALTER TABLE renameme RENAME TO renamed");
t.check("RENAME TO", scalar(db.query("SELECT count(*) FROM sqlite_master WHERE name='renamed'")) === 1);
db.exec("ALTER TABLE renamed RENAME COLUMN x TO y");
t.eq("RENAME COLUMN", db.query("SELECT y FROM renamed").columns[0], "y");
db.exec("DROP TABLE renamed");
t.check("DROP TABLE", scalar(db.query("SELECT count(*) FROM sqlite_master WHERE name='renamed'")) === 0);

t.group("DML — insert / update / delete / affected rows");
t.eq("single INSERT affected=1", db.exec("INSERT INTO users (name,email,age,score) VALUES ('Alice','a@x.io',30,95.5)"), 1);
t.eq("INSERT affected via params", db.exec("INSERT INTO users (name,email,age) VALUES (@n,@e,@a)", { n: "Bob", e: "b@x.io", a: 25 }), 1);
t.eq("multi-row VALUES affected=3", db.exec("INSERT INTO users (name,email,age) VALUES ('Carol','c@x.io',40),('Dave','d@x.io',35),('Eve','e@x.io',28)"), 3);
t.eq("row count = 5", scalar(db.query("SELECT count(*) FROM users")), 5);
t.eq("UPDATE affected=1", db.exec("UPDATE users SET score=@s WHERE name=@n", { s: 88.0, n: "Bob" }), 1);
t.eq("UPDATE many", db.exec("UPDATE users SET active=1 WHERE age > 0"), 5);
t.eq("DELETE affected=1", db.exec("DELETE FROM users WHERE name='Eve'"), 1);
t.eq("row count = 4 after delete", scalar(db.query("SELECT count(*) FROM users")), 4);

db.exec("CREATE TABLE delcnt (id INT)");
db.exec("INSERT INTO delcnt VALUES (1),(2),(3)");
t.eq("parameterless DELETE returns changes()", db.exec("DELETE FROM delcnt"), 3);

t.notThrows("multi-statement exec", () => db.exec("INSERT INTO delcnt VALUES (9); INSERT INTO delcnt VALUES (10);"));
t.eq("batch inserted 2", scalar(db.query("SELECT count(*) FROM delcnt")), 2);

t.group("parameter binding — @name styles + coercion");
db.exec("CREATE TABLE bind (k TEXT, v)");
t.eq("bare key (runtime prepends @)", db.exec("INSERT INTO bind VALUES (@k,@v)", { k: "bare", v: 1 }), 1);
t.eq("@-prefixed key", db.exec("INSERT INTO bind VALUES (@k,@v)", { "@k": "pref", "@v": 2 }), 1);
db.exec("INSERT INTO bind VALUES (@k,@v)", { k: "null", v: null });
db.exec("INSERT INTO bind VALUES (@k,@v)", { k: "true", v: true });
db.exec("INSERT INTO bind VALUES (@k,@v)", { k: "false", v: false });
db.exec("INSERT INTO bind VALUES (@k,@v)", { k: "int", v: 42 });
db.exec("INSERT INTO bind VALUES (@k,@v)", { k: "float", v: 3.5 });
db.exec("INSERT INTO bind VALUES (@k,@v)", { k: "str", v: "hello" });
db.exec("INSERT INTO bind VALUES (@k,@v)", { k: "obj", v: { a: 1 } });
const bv = (k: string) => scalar(db.query("SELECT v FROM bind WHERE k=@k", { k }));
t.eq("null → NULL", bv("null"), null);
t.eq("true → 1", bv("true"), 1);
t.eq("false → 0", bv("false"), 0);
t.eq("int → INTEGER", bv("int"), 42);
t.eq("float → REAL", bv("float"), 3.5);
t.eq("str → TEXT", bv("str"), "hello");
t.eq("object → stringified TEXT", bv("obj"), JSON.stringify({ a: 1 }));
t.eq("typeof int col is number", typeof bv("int"), "number");
t.eq("typeof str col is string", typeof bv("str"), "string");

t.group("QueryResult shape + value mapping");
const q1 = db.query("SELECT id, name FROM users ORDER BY id LIMIT 1");
t.deep("columns is string[]", q1.columns, ["id", "name"]);
t.check("rows is array of arrays", Array.isArray(q1.rows) && Array.isArray(q1.rows[0]));
t.eq("positional row[0] is id", typeof q1.rows[0][0], "number");
db.exec("CREATE TABLE typed (n INTEGER, r REAL, tx TEXT, nl, bl BLOB)");
db.exec("INSERT INTO typed VALUES (7, 2.5, 'hi', NULL, x'00ff')");
const tr = db.query("SELECT n,r,tx,nl,bl FROM typed");
t.eq("INTEGER → number", tr.rows[0][0], 7);
t.eq("REAL → number", tr.rows[0][1], 2.5);
t.eq("TEXT → string", tr.rows[0][2], "hi");
t.eq("NULL → null", tr.rows[0][3], null);
t.eq("BLOB → null (binary not returned)", tr.rows[0][4], null);
t.eq("empty result rows = []", db.query("SELECT * FROM typed WHERE n=999").rows.length, 0);
t.check("empty result keeps columns", db.query("SELECT n,r FROM typed WHERE n=999").columns.length === 2);

t.group("SELECT — WHERE operators");
const names = (sql: string, p?: any) => objs(db.query(sql, p)).map((o) => o.name).sort();
t.deep("= eq", names("SELECT name FROM users WHERE name = 'Alice'"), ["Alice"]);
t.deep("!= ne", names("SELECT name FROM users WHERE name != 'Alice'"), ["Bob", "Carol", "Dave"]);
t.deep("<> ne alt", names("SELECT name FROM users WHERE name <> 'Alice'"), ["Bob", "Carol", "Dave"]);
t.deep("> gt", names("SELECT name FROM users WHERE age > 30"), ["Carol", "Dave"]);
t.deep(">= gte", names("SELECT name FROM users WHERE age >= 30"), ["Alice", "Carol", "Dave"]);
t.deep("< lt", names("SELECT name FROM users WHERE age < 30"), ["Bob"]);
t.deep("<= lte", names("SELECT name FROM users WHERE age <= 30"), ["Alice", "Bob"]);
t.deep("AND", names("SELECT name FROM users WHERE age >= 30 AND score > 0"), ["Alice"]);
t.deep("OR", names("SELECT name FROM users WHERE name='Alice' OR name='Bob'"), ["Alice", "Bob"]);
t.deep("NOT", names("SELECT name FROM users WHERE NOT (age < 30)"), ["Alice", "Carol", "Dave"]);
t.deep("IS NULL", names("SELECT name FROM users WHERE nickname IS NULL"), ["Alice", "Bob", "Carol", "Dave"]);
db.exec("UPDATE users SET nickname='Al' WHERE name='Alice'");
t.deep("IS NOT NULL", names("SELECT name FROM users WHERE nickname IS NOT NULL"), ["Alice"]);
t.deep("IN", names("SELECT name FROM users WHERE name IN ('Alice','Carol')"), ["Alice", "Carol"]);
t.deep("NOT IN", names("SELECT name FROM users WHERE name NOT IN ('Alice','Carol')"), ["Bob", "Dave"]);
t.deep("BETWEEN", names("SELECT name FROM users WHERE age BETWEEN 28 AND 35"), ["Alice", "Dave"]);
t.deep("LIKE A%", names("SELECT name FROM users WHERE name LIKE 'A%'"), ["Alice"]);
t.deep("LIKE %e", names("SELECT name FROM users WHERE name LIKE '%e'"), ["Alice", "Dave"]);
t.check("EXISTS subquery", objs(db.query("SELECT name FROM users WHERE EXISTS (SELECT 1 FROM users u2 WHERE u2.age > 35)")).length === 4);
t.eq("LIKE param bind", scalar(db.query("SELECT count(*) FROM users WHERE name LIKE @p", { p: "A%" })), 1);

t.group("SELECT — order / limit / offset / distinct");
t.deep("ORDER BY name ASC", objs(db.query("SELECT name FROM users ORDER BY name")).map((o) => o.name), ["Alice", "Bob", "Carol", "Dave"]);
t.deep("ORDER BY age DESC", objs(db.query("SELECT name FROM users ORDER BY age DESC")).map((o) => o.name), ["Carol", "Dave", "Alice", "Bob"]);
t.eq("LIMIT", db.query("SELECT * FROM users ORDER BY id LIMIT 2").rows.length, 2);
t.eq("LIMIT OFFSET", scalar(db.query("SELECT name FROM users ORDER BY id LIMIT 1 OFFSET 1")), "Bob");
db.exec("INSERT INTO users (name,email,age) VALUES ('Frank','f@x.io',40)"); 
t.eq("DISTINCT age rows", db.query("SELECT DISTINCT age FROM users").rows.length, 4); 
t.eq("COUNT DISTINCT", scalar(db.query("SELECT COUNT(DISTINCT age) FROM users")), 4);
db.exec("DELETE FROM users WHERE name='Frank'");

t.group("JOINs — inner / left / self / cross");
db.exec("CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INT, product TEXT, amount REAL)");
db.exec("INSERT INTO orders (user_id,product,amount) VALUES (1,'Book',12.5),(1,'Pen',2.0),(3,'Lamp',30.0)");
const uid = (n: string) => scalar(db.query("SELECT id FROM users WHERE name=@n", { n }));
t.eq("INNER JOIN row count", db.query(`SELECT u.name,o.product FROM users u JOIN orders o ON u.id=o.user_id`).rows.length, 3);
t.eq("INNER JOIN filtered", db.query(`SELECT o.product FROM users u JOIN orders o ON u.id=o.user_id WHERE u.id=${uid("Alice")}`).rows.length, 2);
t.eq("LEFT JOIN keeps unmatched", db.query(`SELECT u.name,o.product FROM users u LEFT JOIN orders o ON u.id=o.user_id`).rows.length, 5); 
t.check("LEFT JOIN null for unmatched", objs(db.query(`SELECT u.name,o.product FROM users u LEFT JOIN orders o ON u.id=o.user_id WHERE u.name='Bob'`))[0].product === null);
t.eq("CROSS JOIN cardinality", db.query("SELECT * FROM users CROSS JOIN orders").rows.length, 4 * 3);
t.check("self join", db.query("SELECT a.name FROM users a JOIN users b ON a.age=b.age WHERE a.id<>b.id").rows.length >= 0);

t.group("aggregation — group by / having / aggregates");
t.eq("COUNT(*)", scalar(db.query("SELECT COUNT(*) FROM orders")), 3);
t.eq("SUM", scalar(db.query("SELECT SUM(amount) FROM orders")), 44.5);
t.check("AVG", Math.abs(scalar(db.query("SELECT AVG(amount) FROM orders")) - 44.5 / 3) < 1e-9);
t.eq("MIN", scalar(db.query("SELECT MIN(amount) FROM orders")), 2.0);
t.eq("MAX", scalar(db.query("SELECT MAX(amount) FROM orders")), 30.0);
t.eq("GROUP BY", db.query("SELECT user_id, COUNT(*) c FROM orders GROUP BY user_id").rows.length, 2);
t.eq("HAVING", db.query("SELECT user_id, COUNT(*) c FROM orders GROUP BY user_id HAVING COUNT(*) > 1").rows.length, 1);
t.eq("group_concat", scalar(db.query("SELECT group_concat(product, ',') FROM orders WHERE user_id=1")).split(",").length, 2);

t.group("CASE / subquery / CTE / window functions");
t.eq("CASE", scalar(db.query("SELECT CASE WHEN 40>=30 THEN 'senior' ELSE 'junior' END")), "senior");
t.eq("scalar subquery", scalar(db.query("SELECT (SELECT COUNT(*) FROM orders) AS c")), 3);
t.eq("IN subquery", db.query("SELECT name FROM users WHERE id IN (SELECT user_id FROM orders)").rows.length, 2);
t.eq("CTE", db.query("WITH big AS (SELECT * FROM orders WHERE amount>10) SELECT * FROM big").rows.length, 2);
t.eq("recursive CTE", scalar(db.query("WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM c WHERE n<5) SELECT COUNT(*) FROM c")), 5);
t.deep("ROW_NUMBER", objs(db.query("SELECT product, ROW_NUMBER() OVER (ORDER BY amount DESC) rn FROM orders")).map((o) => o.rn), [1, 2, 3]);
t.eq("RANK present", db.query("SELECT product, RANK() OVER (ORDER BY amount) r FROM orders").rows.length, 3);
t.check("LAG/LEAD", db.query("SELECT amount, LAG(amount) OVER (ORDER BY amount) lg, LEAD(amount) OVER (ORDER BY amount) ld FROM orders").rows.length === 3);

t.group("built-in functions — string / math / datetime / conditional");
t.eq("length", scalar(db.query("SELECT length('hello')")), 5);
t.eq("upper", scalar(db.query("SELECT upper('abc')")), "ABC");
t.eq("lower", scalar(db.query("SELECT lower('ABC')")), "abc");
t.eq("trim", scalar(db.query("SELECT trim('  x  ')")), "x");
t.eq("ltrim", scalar(db.query("SELECT ltrim('  x')")), "x");
t.eq("rtrim", scalar(db.query("SELECT rtrim('x  ')")), "x");
t.eq("substr", scalar(db.query("SELECT substr('hello',2,3)")), "ell");
t.eq("replace", scalar(db.query("SELECT replace('a-b-c','-','_')")), "a_b_c");
t.eq("instr", scalar(db.query("SELECT instr('hello','ll')")), 3);
t.eq("concat ||", scalar(db.query("SELECT 'a' || 'b' || 'c'")), "abc");
t.eq("printf", scalar(db.query("SELECT printf('%d-%s', 5, 'x')")), "5-x");
t.eq("abs", scalar(db.query("SELECT abs(-7)")), 7);
t.eq("round", scalar(db.query("SELECT round(3.14159, 2)")), 3.14);
t.eq("min scalar", scalar(db.query("SELECT min(3,1,2)")), 1);
t.eq("max scalar", scalar(db.query("SELECT max(3,1,2)")), 3);
t.eq("date deterministic", scalar(db.query("SELECT date('2020-01-15')")), "2020-01-15");
t.eq("datetime deterministic", scalar(db.query("SELECT datetime('2020-01-15 10:30:00')")), "2020-01-15 10:30:00");
t.eq("strftime year", scalar(db.query("SELECT strftime('%Y','2020-01-15')")), "2020");
t.eq("strftime unix", scalar(db.query("SELECT strftime('%s','1970-01-01 00:00:01')")), "1");
t.eq("coalesce", scalar(db.query("SELECT coalesce(NULL, NULL, 5)")), 5);
t.eq("nullif equal→null", scalar(db.query("SELECT nullif(3,3)")), null);
t.eq("nullif diff", scalar(db.query("SELECT nullif(3,4)")), 3);
t.eq("iif true", scalar(db.query("SELECT iif(1>0, 'y', 'n')")), "y");
t.eq("ifnull", scalar(db.query("SELECT ifnull(NULL, 'def')")), "def");
t.eq("typeof int", scalar(db.query("SELECT typeof(5)")), "integer");
t.eq("typeof text", scalar(db.query("SELECT typeof('x')")), "text");
t.eq("typeof null", scalar(db.query("SELECT typeof(NULL)")), "null");
t.eq("typeof real", scalar(db.query("SELECT typeof(1.5)")), "real");

t.group("conflict resolution — OR IGNORE / OR REPLACE / upsert");
db.exec("CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT)");
db.exec("INSERT INTO kv VALUES ('a','1')");
t.eq("INSERT OR IGNORE skips dup", db.exec("INSERT OR IGNORE INTO kv VALUES ('a','2')"), 0);
t.eq("value unchanged after IGNORE", scalar(db.query("SELECT v FROM kv WHERE k='a'")), "1");
db.exec("INSERT OR REPLACE INTO kv VALUES ('a','3')");
t.eq("OR REPLACE overwrites", scalar(db.query("SELECT v FROM kv WHERE k='a'")), "3");
db.exec("INSERT INTO kv VALUES ('a','x') ON CONFLICT(k) DO UPDATE SET v='upserted'");
t.eq("ON CONFLICT DO UPDATE (upsert)", scalar(db.query("SELECT v FROM kv WHERE k='a'")), "upserted");

t.group("prepared statements");
const ins = db.prepare("INSERT INTO kv VALUES (@k,@v)");
t.eq("stmt.exec affected=1", ins.exec({ k: "p1", v: "one" }), 1);
t.eq("stmt reuse affected=1", ins.exec({ k: "p2", v: "two" }), 1);
ins.close();
const sel = db.prepare("SELECT v FROM kv WHERE k=@k");
t.eq("stmt.query #1", scalar(sel.query({ k: "p1" })), "one");
t.eq("stmt.query #2 (reused)", scalar(sel.query({ k: "p2" })), "two");
t.deep("stmt.query shape", sel.query({ k: "p1" }).columns, ["v"]);
sel.close();

t.group("transactions — BEGIN/COMMIT/ROLLBACK via exec");
db.exec("CREATE TABLE acct (id INT, bal INT)");
db.exec("INSERT INTO acct VALUES (1,100),(2,0)");
db.exec("BEGIN");
db.exec("UPDATE acct SET bal=bal-50 WHERE id=1");
db.exec("UPDATE acct SET bal=bal+50 WHERE id=2");
db.exec("COMMIT");
t.eq("commit persisted id1", scalar(db.query("SELECT bal FROM acct WHERE id=1")), 50);
t.eq("commit persisted id2", scalar(db.query("SELECT bal FROM acct WHERE id=2")), 50);
db.exec("BEGIN");
db.exec("UPDATE acct SET bal=0 WHERE id=1");
db.exec("ROLLBACK");
t.eq("rollback reverted", scalar(db.query("SELECT bal FROM acct WHERE id=1")), 50);

t.group("error handling");
t.throws("syntax error throws", () => db.query("SELCT bad"), /db:|syntax/);
t.throws("no such table", () => db.query("SELECT * FROM nope"), /db:|no such table/);
t.throws("NOT NULL violation", () => db.exec("INSERT INTO users (name) VALUES (NULL)"), /db:|NOT NULL/);
t.throws("UNIQUE violation", () => db.exec("INSERT INTO users (name,email) VALUES ('Alice','dup@x.io')"), /db:|UNIQUE/);
t.throws("NOW() is not SQLite", () => db.query("SELECT NOW()"), /db:|no such function/);

db.close();
rm(DBP);
t.done("ekko:db (SQLite) covered");
