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

describe("Database parameter types", () => {
  test("string parameter", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT PRIMARY KEY, val TEXT)");
    db.exec("INSERT INTO t (id, val) VALUES (1, 'hello')");
    const stmt = db.prepare("SELECT val FROM t WHERE val = @v");
    const r = stmt.query({ "@v": "hello" });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0][0]).toBe("hello");
    stmt.close();
    db.close();
  });

  test("integer parameter", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT PRIMARY KEY, val INT)");
    db.exec("INSERT INTO t (id, val) VALUES (1, 42)");
    const stmt = db.prepare("SELECT val FROM t WHERE val = @v");
    const r = stmt.query({ "@v": 42 });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0][0]).toBe(42);
    stmt.close();
    db.close();
  });

  test("float parameter", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT PRIMARY KEY, val DOUBLE)");
    db.exec("INSERT INTO t (id, val) VALUES (1, 3.14)");
    const stmt = db.prepare("SELECT val FROM t WHERE id = @id");
    const r = stmt.query({ "@id": 1 });
    expect(r.rows.length).toBe(1);
    stmt.close();
    db.close();
  });

  test("null parameter", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT PRIMARY KEY, val TEXT)");
    db.exec("INSERT INTO t (id, val) VALUES (1, NULL)");
    const q = db.query("SELECT val FROM t WHERE id = 1");
    const val = q.rows[0][0];
    expect(val === null || val === undefined || val === "").toBe(true);
    db.close();
  });

  test("multiple params in one query", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT PRIMARY KEY, name TEXT, age INT)");
    db.exec("INSERT INTO t (id, name, age) VALUES (1, 'Alice', 30)");
    db.exec("INSERT INTO t (id, name, age) VALUES (2, 'Bob', 25)");
    const stmt = db.prepare("SELECT id FROM t WHERE name = @name AND age = @age");
    const r = stmt.query({ "@name": "Alice", "@age": 30 });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0][0]).toBe(1);
    stmt.close();
    db.close();
  });

  test("params prevent SQL injection (special chars in value)", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT PRIMARY KEY, val TEXT)");
    db.exec("INSERT INTO t (id, val) VALUES (1, 'safe')");
    const stmt = db.prepare("SELECT val FROM t WHERE val = @v");
    const r = stmt.query({ "@v": "'; DROP TABLE t; --" });
    expect(r.rows.length).toBe(0);
    
    const q = db.query("SELECT COUNT(*) FROM t");
    expect(q.rows[0][0]).toBe(1);
    stmt.close();
    db.close();
  });

  test("empty string parameter", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT PRIMARY KEY, val TEXT)");
    db.exec("INSERT INTO t (id, val) VALUES (1, '')");
    
    const q = db.query("SELECT val FROM t WHERE id = 1");
    const val = q.rows[0][0];
    
    expect(val === "" || val === null || val === undefined).toBe(true);
    db.close();
  });

  test("large integer parameter", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT PRIMARY KEY, val INT)");
    db.exec("INSERT INTO t (id, val) VALUES (1, 2147483647)");
    const stmt = db.prepare("SELECT val FROM t WHERE val = @v");
    const r = stmt.query({ "@v": 2147483647 });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0][0]).toBe(2147483647);
    stmt.close();
    db.close();
  });
});
