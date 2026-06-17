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
import { tempFile, remove, exists } from "ekko:fs";
const c: [string, boolean][] = [];

const tmpPath = tempFile("ekko-db-test", ".triodb");
remove(tmpPath);
const fdb = Database(tmpPath);
fdb.exec("CREATE TABLE t (id INT PRIMARY KEY, val TEXT)");
fdb.exec("INSERT INTO t (id, val) VALUES (1, 'persisted')");
fdb.close();

const fdb2 = Database(tmpPath);
const fq = fdb2.query("SELECT val FROM t WHERE id = 1");
c.push(["file db persists", fq.rows.length === 1 && fq.rows[0][0] === "persisted"]);
fdb2.close();
remove(tmpPath);
c.push(["file db cleanup", !exists(tmpPath)]);

const db = Database(":memory:");
c.push(["create memory db", typeof db === "object" && db._handle > 0]);

db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT NOT NULL, email TEXT, age INT)");
db.exec("CREATE TABLE orders (id INT PRIMARY KEY, user_id INT, product TEXT, amount DOUBLE)");
db.exec("CREATE INDEX idx_email ON users (email)");
c.push(["create tables + index", true]);

const r1 = db.exec("INSERT INTO users (id, name, email, age) VALUES (1, 'Alice', 'alice@test.com', 30)");
c.push(["insert returns 1", r1 === 1]);
db.exec("INSERT INTO users (id, name, email, age) VALUES (2, 'Bob', 'bob@test.com', 25)");
db.exec("INSERT INTO users (id, name, email, age) VALUES (3, 'Charlie', 'charlie@test.com', 35)");
db.exec("INSERT INTO orders (id, user_id, product, amount) VALUES (1, 1, 'Widget', 9.99)");
db.exec("INSERT INTO orders (id, user_id, product, amount) VALUES (2, 1, 'Gadget', 24.50)");
db.exec("INSERT INTO orders (id, user_id, product, amount) VALUES (3, 2, 'Widget', 9.99)");

const q1 = db.query("SELECT id, name FROM users WHERE age > 26 ORDER BY name");
c.push(["where + order", q1.rows.length === 2 && q1.rows[0][1] === "Alice" && q1.rows[1][1] === "Charlie"]);

const q2 = db.query("SELECT COUNT(*) AS cnt, SUM(amount) AS total FROM orders");
c.push(["aggregate", q2.rows[0][0] === 3]);

const q3 = db.query("SELECT u.name, o.product FROM users u JOIN orders o ON u.id = o.user_id WHERE u.name = 'Alice'");
c.push(["join", q3.rows.length === 2]);

db.exec("UPDATE users SET age = 31 WHERE id = 1");
const q4 = db.query("SELECT age FROM users WHERE id = 1");
c.push(["update", q4.rows[0][0] === 31]);

db.exec("DELETE FROM orders WHERE id = 3");
const q5 = db.query("SELECT COUNT(*) FROM orders");
c.push(["delete", q5.rows[0][0] === 2]);

const q6 = db.query("SELECT name FROM users WHERE email LIKE '%bob%'");
c.push(["like", q6.rows.length === 1 && q6.rows[0][0] === "Bob"]);

const stmt = db.prepare("SELECT name, age FROM users WHERE id = @id");
const r2 = stmt.query({"@id": 2});
c.push(["prepared query", r2.rows.length === 1 && r2.rows[0][0] === "Bob"]);
stmt.close();

const q8 = db.query("SELECT UPPER(name), LENGTH(name) FROM users WHERE id = 1");
c.push(["string funcs", q8.rows[0][0] === "ALICE" && q8.rows[0][1] === 5]);

const q9 = db.query("SELECT name, CASE WHEN age >= 30 THEN 'senior' ELSE 'junior' END AS tier FROM users ORDER BY id");
c.push(["case expr", q9.rows[0][1] === "senior" && q9.rows[1][1] === "junior"]);

db.close();
c.push(["close", true]);

let p = 0, f = 0;
for (const [n, ok] of c) {
  if (ok) { p++; console.log("  PASS:", n); }
  else { f++; console.log("  FAIL:", n); }
}
console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
