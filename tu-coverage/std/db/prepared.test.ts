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

describe("Database prepared statements", () => {
  test("prepare returns statement object", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    const stmt = db.prepare("SELECT name FROM users WHERE id = @id");
    expect(typeof stmt).toBe("object");
    stmt.close();
    db.close();
  });

  test("stmtQuery with params returns rows", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    db.exec("INSERT INTO users (id, name) VALUES (1, 'Alice')");
    db.exec("INSERT INTO users (id, name) VALUES (2, 'Bob')");
    const stmt = db.prepare("SELECT name FROM users WHERE id = @id");
    const result = stmt.query({ "@id": 1 });
    expect(result.rows.length).toBe(1);
    expect(result.rows[0][0]).toBe("Alice");
    stmt.close();
    db.close();
  });

  test("stmtQuery with different param", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    db.exec("INSERT INTO users (id, name) VALUES (1, 'Alice')");
    db.exec("INSERT INTO users (id, name) VALUES (2, 'Bob')");
    const stmt = db.prepare("SELECT name FROM users WHERE id = @id");
    const r1 = stmt.query({ "@id": 1 });
    expect(r1.rows[0][0]).toBe("Alice");
    const r2 = stmt.query({ "@id": 2 });
    expect(r2.rows[0][0]).toBe("Bob");
    stmt.close();
    db.close();
  });

  test("prepared statement reuse with multiple executions", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE items (id INT PRIMARY KEY, val TEXT)");
    const stmt = db.prepare("INSERT INTO items (id, val) VALUES (@id, @val)");
    stmt.exec({ "@id": 1, "@val": "first" });
    stmt.exec({ "@id": 2, "@val": "second" });
    stmt.exec({ "@id": 3, "@val": "third" });
    stmt.close();
    const q = db.query("SELECT COUNT(*) FROM items");
    expect(q.rows[0][0]).toBe(3);
    db.close();
  });

  test("stmtClose cleanup", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT)");
    const stmt = db.prepare("SELECT * FROM t");
    stmt.close();
    expect(true).toBe(true);
    db.close();
  });

  test("prepared SELECT with string param", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    db.exec("INSERT INTO users (id, name) VALUES (1, 'Alice')");
    const stmt = db.prepare("SELECT id FROM users WHERE name = @name");
    const r = stmt.query({ "@name": "Alice" });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0][0]).toBe(1);
    stmt.close();
    db.close();
  });

  test("prepared INSERT then verify", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE settings (name TEXT PRIMARY KEY, val TEXT)");
    db.exec("INSERT INTO settings (name, val) VALUES ('color', 'blue')");
    const stmt = db.prepare("SELECT val FROM settings WHERE name = @name");
    const r = stmt.query({ "@name": "color" });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0][0]).toBe("blue");
    stmt.close();
    db.close();
  });

  test("prepared query no match returns empty", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    const stmt = db.prepare("SELECT name FROM users WHERE id = @id");
    const r = stmt.query({ "@id": 999 });
    expect(r.rows.length).toBe(0);
    stmt.close();
    db.close();
  });

  test("prepared statement with multiple params", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE products (id INT PRIMARY KEY, name TEXT, price DOUBLE)");
    db.exec("INSERT INTO products (id, name, price) VALUES (1, 'Widget', 9.99)");
    db.exec("INSERT INTO products (id, name, price) VALUES (2, 'Gadget', 24.50)");
    const stmt = db.prepare("SELECT name FROM products WHERE name = @name AND price = @price");
    const r = stmt.query({ "@name": "Widget", "@price": 9.99 });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0][0]).toBe("Widget");
    stmt.close();
    db.close();
  });

  test("different params each execution of same statement", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE log (id INT PRIMARY KEY, msg TEXT)");
    const stmt = db.prepare("INSERT INTO log (id, msg) VALUES (@id, @msg)");
    for (let i = 1; i <= 5; i++) {
      stmt.exec({ "@id": i, "@msg": `message ${i}` });
    }
    stmt.close();
    const q = db.query("SELECT COUNT(*) FROM log");
    expect(q.rows[0][0]).toBe(5);
    db.close();
  });
});
