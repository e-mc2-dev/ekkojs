// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { describe, test, expect } from "ekko:test";
import { Database } from "ekko:db";

function createPopulatedDb() {
  const db = Database(":memory:");
  db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT, email TEXT, age INT)");
  db.exec("CREATE TABLE orders (id INT PRIMARY KEY, user_id INT, product TEXT, amount DOUBLE)");
  db.exec("INSERT INTO users (id, name, email, age) VALUES (1, 'Alice', 'alice@test.com', 30)");
  db.exec("INSERT INTO users (id, name, email, age) VALUES (2, 'Bob', 'bob@test.com', 25)");
  db.exec("INSERT INTO users (id, name, email, age) VALUES (3, 'Charlie', 'charlie@test.com', 35)");
  db.exec("INSERT INTO orders (id, user_id, product, amount) VALUES (1, 1, 'Widget', 9.99)");
  db.exec("INSERT INTO orders (id, user_id, product, amount) VALUES (2, 1, 'Gadget', 24.50)");
  db.exec("INSERT INTO orders (id, user_id, product, amount) VALUES (3, 2, 'Widget', 9.99)");
  return db;
}

describe("Database queries", () => {
  test("WHERE clause filtering", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT name FROM users WHERE age > 26");
    expect(q.rows.length).toBe(2);
    db.close();
  });

  test("ORDER BY sorting", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT name FROM users ORDER BY age ASC");
    expect(q.rows[0][0]).toBe("Bob");
    expect(q.rows[2][0]).toBe("Charlie");
    db.close();
  });

  test("COUNT aggregate", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT COUNT(*) FROM users");
    expect(q.rows[0][0]).toBe(3);
    db.close();
  });

  test("SUM aggregate", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT SUM(amount) FROM orders");
    expect(q.rows[0][0]).toBeGreaterThan(0);
    db.close();
  });

  test("AVG aggregate", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT AVG(age) FROM users");
    expect(q.rows[0][0]).toBe(30);
    db.close();
  });

  test("LIKE pattern matching", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT name FROM users WHERE email LIKE '%bob%'");
    expect(q.rows.length).toBe(1);
    expect(q.rows[0][0]).toBe("Bob");
    db.close();
  });

  test("CASE expression", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT name, CASE WHEN age >= 30 THEN 'senior' ELSE 'junior' END AS tier FROM users ORDER BY id");
    expect(q.rows[0][1]).toBe("senior");
    expect(q.rows[1][1]).toBe("junior");
    expect(q.rows[2][1]).toBe("senior");
    db.close();
  });

  test("JOIN between tables", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT u.name, o.product FROM users u JOIN orders o ON u.id = o.user_id WHERE u.name = 'Alice'");
    expect(q.rows.length).toBe(2);
    db.close();
  });

  test("GROUP BY", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT user_id, COUNT(*) AS cnt FROM orders GROUP BY user_id ORDER BY user_id");
    expect(q.rows[0][0]).toBe(1);
    expect(q.rows[0][1]).toBe(2);
    expect(q.rows[1][0]).toBe(2);
    expect(q.rows[1][1]).toBe(1);
    db.close();
  });

  test("LIMIT clause", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT name FROM users ORDER BY id LIMIT 2");
    expect(q.rows.length).toBe(2);
    db.close();
  });

  test("ORDER BY DESC", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT name FROM users ORDER BY age DESC");
    expect(q.rows[0][0]).toBe("Charlie");
    db.close();
  });

  test("WHERE with multiple conditions", () => {
    const db = createPopulatedDb();
    const q = db.query("SELECT name FROM users WHERE age >= 25 AND age <= 30 ORDER BY name");
    expect(q.rows.length).toBe(2);
    db.close();
  });
});
