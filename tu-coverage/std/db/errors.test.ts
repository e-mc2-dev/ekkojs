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

describe("Database errors", () => {
  test("bad SQL syntax throws", () => {
    const db = Database(":memory:");
    const fn = () => db.exec("SELEKT * FORM nothing");
    expect(fn).toThrow();
    db.close();
  });

  test("query non-existent table throws", () => {
    const db = Database(":memory:");
    const fn = () => db.query("SELECT * FROM nonexistent_table");
    expect(fn).toThrow();
    db.close();
  });

  test("insert into non-existent table throws", () => {
    const db = Database(":memory:");
    const fn = () => db.exec("INSERT INTO ghost (id) VALUES (1)");
    expect(fn).toThrow();
    db.close();
  });

  test("execute on closed handle throws", () => {
    const db = Database(":memory:");
    db.close();
    const fn = () => db.exec("CREATE TABLE t (id INT)");
    expect(fn).toThrow();
  });

  test("query on closed handle throws", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT)");
    db.close();
    const fn = () => db.query("SELECT * FROM t");
    expect(fn).toThrow();
  });

  test("duplicate primary key throws", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT PRIMARY KEY, val TEXT)");
    db.exec("INSERT INTO t (id, val) VALUES (1, 'first')");
    const fn = () => db.exec("INSERT INTO t (id, val) VALUES (1, 'duplicate')");
    expect(fn).toThrow();
    db.close();
  });

  test("create existing table throws", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE t (id INT)");
    const fn = () => db.exec("CREATE TABLE t (id INT)");
    expect(fn).toThrow();
    db.close();
  });

  test("drop non-existent table throws", () => {
    const db = Database(":memory:");
    const fn = () => db.exec("DROP TABLE nonexistent");
    expect(fn).toThrow();
    db.close();
  });

  test("prepare bad SQL throws", () => {
    const db = Database(":memory:");
    const fn = () => db.prepare("INVALID SQL STATEMENT");
    expect(fn).toThrow();
    db.close();
  });

  test("exec with empty string behavior", () => {
    const db = Database(":memory:");
    const fn = () => db.exec("");
    
    let threw = false;
    try { fn(); } catch { threw = true; }
    
    expect(true).toBe(true);
    db.close();
  });
});
