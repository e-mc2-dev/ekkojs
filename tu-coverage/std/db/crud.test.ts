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

describe("Database CRUD", () => {
  test("CREATE TABLE", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT, age INT)");
    const q = db.query("SELECT COUNT(*) FROM users");
    expect(q.rows[0][0]).toBe(0);
    db.close();
  });

  test("INSERT row", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    const affected = db.exec("INSERT INTO users (id, name) VALUES (1, 'Alice')");
    expect(affected).toBe(1);
    db.close();
  });

  test("SELECT returns inserted data", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    db.exec("INSERT INTO users (id, name) VALUES (1, 'Alice')");
    const q = db.query("SELECT id, name FROM users WHERE id = 1");
    expect(q.rows.length).toBe(1);
    expect(q.rows[0][0]).toBe(1);
    expect(q.rows[0][1]).toBe("Alice");
    db.close();
  });

  test("UPDATE row", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    db.exec("INSERT INTO users (id, name) VALUES (1, 'Alice')");
    db.exec("UPDATE users SET name = 'Bob' WHERE id = 1");
    const q = db.query("SELECT name FROM users WHERE id = 1");
    expect(q.rows[0][0]).toBe("Bob");
    db.close();
  });

  test("SELECT after UPDATE shows new data", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE items (id INT PRIMARY KEY, val INT)");
    db.exec("INSERT INTO items (id, val) VALUES (1, 10)");
    db.exec("UPDATE items SET val = 20 WHERE id = 1");
    const q = db.query("SELECT val FROM items WHERE id = 1");
    expect(q.rows[0][0]).toBe(20);
    db.close();
  });

  test("DELETE row", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    db.exec("INSERT INTO users (id, name) VALUES (1, 'Alice')");
    db.exec("DELETE FROM users WHERE id = 1");
    const q = db.query("SELECT COUNT(*) FROM users");
    expect(q.rows[0][0]).toBe(0);
    db.close();
  });

  test("SELECT after DELETE returns empty", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    db.exec("INSERT INTO users (id, name) VALUES (1, 'Alice')");
    db.exec("DELETE FROM users WHERE id = 1");
    const q = db.query("SELECT * FROM users WHERE id = 1");
    expect(q.rows.length).toBe(0);
    db.close();
  });

  test("INSERT multiple rows", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    db.exec("INSERT INTO users (id, name) VALUES (1, 'Alice')");
    db.exec("INSERT INTO users (id, name) VALUES (2, 'Bob')");
    db.exec("INSERT INTO users (id, name) VALUES (3, 'Charlie')");
    const q = db.query("SELECT COUNT(*) FROM users");
    expect(q.rows[0][0]).toBe(3);
    db.close();
  });

  test("SELECT all returns all rows", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)");
    db.exec("INSERT INTO users (id, name) VALUES (1, 'Alice')");
    db.exec("INSERT INTO users (id, name) VALUES (2, 'Bob')");
    const q = db.query("SELECT * FROM users ORDER BY id");
    expect(q.rows.length).toBe(2);
    expect(q.rows[0][1]).toBe("Alice");
    expect(q.rows[1][1]).toBe("Bob");
    db.close();
  });

  test("DROP TABLE", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE temp_table (id INT)");
    db.exec("DROP TABLE temp_table");
    const fn = () => db.query("SELECT * FROM temp_table");
    expect(fn).toThrow();
    db.close();
  });

  test("INSERT and SELECT with various types", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE mixed (id INT PRIMARY KEY, name TEXT, score DOUBLE, active INT)");
    db.exec("INSERT INTO mixed (id, name, score, active) VALUES (1, 'test', 9.5, 1)");
    const q = db.query("SELECT name, score, active FROM mixed WHERE id = 1");
    expect(q.rows[0][0]).toBe("test");
    expect(q.rows[0][2]).toBe(1);
    db.close();
  });

  test("UPDATE multiple rows", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE items (id INT PRIMARY KEY, status TEXT)");
    db.exec("INSERT INTO items (id, status) VALUES (1, 'active')");
    db.exec("INSERT INTO items (id, status) VALUES (2, 'active')");
    db.exec("INSERT INTO items (id, status) VALUES (3, 'inactive')");
    db.exec("UPDATE items SET status = 'archived' WHERE status = 'active'");
    const q = db.query("SELECT COUNT(*) FROM items WHERE status = 'archived'");
    expect(q.rows[0][0]).toBe(2);
    db.close();
  });
});
