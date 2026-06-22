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
import { orm, connect, defineTable } from "ekko:db/orm";
import { Database } from "ekko:db";

function setup() {
    const db = connect(Database(":memory:"));
    const users = defineTable("users", { id: { type: "INT", primaryKey: true }, name: { type: "TEXT" }, email: { type: "TEXT" }, age: { type: "INT" } });
    db.createTable(users);
    return { db, users };
}

describe("ekko:orm — Connection", () => {
    test("db._conn exists", () => {
        const { db } = setup();
        expect(db._conn).not.toBe(null);
        expect(db._conn).not.toBe(undefined);
        db.close();
    });

    test("db._conn.dialect is SqliteDialect", () => {
        const { db } = setup();
        expect(db._conn.dialect).not.toBe(null);
        expect(db._conn.dialect.name).toBe("sqlite");
        db.close();
    });

    test("db._conn.execute is a function", () => {
        const { db } = setup();
        expect(typeof db._conn.execute).toBe("function");
        db.close();
    });

    test("db._conn.query is a function", () => {
        const { db } = setup();
        expect(typeof db._conn.query).toBe("function");
        db.close();
    });

    test("db._conn.beginTransaction is a function", () => {
        const { db } = setup();
        expect(typeof db._conn.beginTransaction).toBe("function");
        db.close();
    });

    test("db._conn.close is a function", () => {
        const { db } = setup();
        expect(typeof db._conn.close).toBe("function");
        db.close();
    });

    test("Raw execute: db.exec('CREATE TABLE t (id INT)')", () => {
        const db = connect(Database(":memory:"));
        const result = db.exec("CREATE TABLE t (id INT)");
        expect(result).not.toBe(null);
        db.close();
    });

    test("Raw query: db.query('SELECT 1') returns {columns, rows}", () => {
        const { db } = setup();
        const result = db.query("SELECT 1 as val");
        expect(result.columns).not.toBe(undefined);
        expect(result.rows).not.toBe(undefined);
        db.close();
    });

    test("Execute with params", () => {
        const { db, users } = setup();
        const result = db.exec("INSERT INTO users (id, name, email, age) VALUES (10, @name, @email, @age)", { name: "Test", email: "test@test.com", age: 99 });
        expect(result).not.toBe(null);
        db.close();
    });

    test("Query with params", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 1, name: "Alice", email: "alice@test.com", age: 30 }).exec();
        const result = db.query("SELECT * FROM users WHERE name = @name", { name: "Alice" });
        expect(result.rows.length).toBe(1);
        db.close();
    });

    test("Query returns correct column names", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 1, name: "Alice", email: "alice@test.com", age: 30 }).exec();
        const result = db.query("SELECT name, age FROM users");
        expect(result.columns.includes("name")).toBe(true);
        expect(result.columns.includes("age")).toBe(true);
        db.close();
    });

    test("Query returns correct row values", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 1, name: "Alice", email: "alice@test.com", age: 30 }).exec();
        const result = db.query("SELECT name, age FROM users WHERE id = 1");
        const nameIdx = result.columns.indexOf("name");
        const ageIdx = result.columns.indexOf("age");
        expect(result.rows[0][nameIdx]).toBe("Alice");
        expect(result.rows[0][ageIdx]).toBe(30);
        db.close();
    });

    test("Multiple queries in sequence", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 1, name: "Alice", email: "alice@test.com", age: 30 }).exec();
        db.from(users).insert({ id: 2, name: "Bob", email: "bob@test.com", age: 25 }).exec();
        const r1 = db.query("SELECT * FROM users WHERE id = 1");
        const r2 = db.query("SELECT * FROM users WHERE id = 2");
        const nameIdx1 = r1.columns.indexOf("name");
        const nameIdx2 = r2.columns.indexOf("name");
        expect(r1.rows[0][nameIdx1]).toBe("Alice");
        expect(r2.rows[0][nameIdx2]).toBe("Bob");
        db.close();
    });

    test("Close doesn't crash", () => {
        const { db } = setup();
        db.close();
        expect(true).toBe(true);
    });

    test("Execute returns object with affectedRows", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 1, name: "Alice", email: "alice@test.com", age: 30 }).exec();
        const result = db.exec("DELETE FROM users WHERE id = 1");
        expect(result.affectedRows).toBe(1);
        db.close();
    });
});
