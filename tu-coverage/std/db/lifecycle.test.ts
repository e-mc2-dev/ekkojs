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
import { tempFile, remove, exists } from "ekko:fs";

describe("Database lifecycle", () => {
  test("openOrCreate with temp file creates database", () => {
    const path = tempFile("ekko-db-lifecycle", ".triodb");
    remove(path);
    const db = Database(path);
    expect(typeof db).toBe("object");
    expect(db._handle).toBeGreaterThan(0);
    db.close();
    remove(path);
  });

  test("in-memory database creates successfully", () => {
    const db = Database(":memory:");
    expect(typeof db).toBe("object");
    expect(db._handle).toBeGreaterThan(0);
    db.close();
  });

  test("execute CREATE TABLE succeeds", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE test (id INT PRIMARY KEY, val TEXT)");
    const q = db.query("SELECT COUNT(*) FROM test");
    expect(q.rows[0][0]).toBe(0);
    db.close();
  });

  test("close database handle succeeds", () => {
    const db = Database(":memory:");
    db.close();
    expect(true).toBe(true);
  });

  test("reopen closed file database, data persists", () => {
    const path = tempFile("ekko-db-persist", ".triodb");
    remove(path);
    const db1 = Database(path);
    db1.exec("CREATE TABLE items (id INT PRIMARY KEY, name TEXT)");
    db1.exec("INSERT INTO items (id, name) VALUES (1, 'persisted')");
    db1.close();

    const db2 = Database(path);
    const q = db2.query("SELECT name FROM items WHERE id = 1");
    expect(q.rows.length).toBe(1);
    expect(q.rows[0][0]).toBe("persisted");
    db2.close();
    remove(path);
  });

  test("close then query throws", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT)");
    db.close();
    const fn = () => db.query("SELECT * FROM t");
    expect(fn).toThrow();
  });

  test("close then exec throws", () => {
    const db = Database(":memory:");
    db.close();
    const fn = () => db.exec("CREATE TABLE t (id INT)");
    expect(fn).toThrow();
  });

  test("file cleanup after remove", () => {
    const path = tempFile("ekko-db-cleanup", ".triodb");
    remove(path);
    const db = Database(path);
    db.exec("CREATE TABLE t (id INT)");
    db.close();
    remove(path);
    expect(exists(path)).toBe(false);
  });
});
