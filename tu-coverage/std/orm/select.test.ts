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
    db.from(users).insert({ id: 1, name: "Alice", email: "alice@test.com", age: 30 }).exec();
    db.from(users).insert({ id: 2, name: "Bob", email: "bob@test.com", age: 25 }).exec();
    db.from(users).insert({ id: 3, name: "Charlie", email: "charlie@test.com", age: 35 }).exec();
    db.from(users).insert({ id: 4, name: "Diana", email: "diana@test.com", age: 28 }).exec();
    db.from(users).insert({ id: 5, name: "Eve", email: "eve@test.com", age: 22 }).exec();
    return { db, users };
}

describe("ekko:orm — SELECT Queries", () => {
    test(".toArray() returns array", () => {
        const { db, users } = setup();
        const result = db.from(users).toArray();
        expect(Array.isArray(result)).toBe(true);
        db.close();
    });

    test(".toArray() returns objects with column keys", () => {
        const { db, users } = setup();
        const result = db.from(users).toArray();
        const row = result[0];
        expect(row.id).not.toBe(undefined);
        expect(row.name).not.toBe(undefined);
        expect(row.email).not.toBe(undefined);
        expect(row.age).not.toBe(undefined);
        db.close();
    });

    test(".select('name') returns only name", () => {
        const { db, users } = setup();
        const result = db.from(users).select("name").toArray();
        const row = result[0];
        expect(row.name).not.toBe(undefined);
        expect(row.id).toBe(undefined);
        db.close();
    });

    test(".select('name', 'age') returns two fields", () => {
        const { db, users } = setup();
        const result = db.from(users).select("name", "age").toArray();
        const row = result[0];
        expect(row.name).not.toBe(undefined);
        expect(row.age).not.toBe(undefined);
        expect(row.email).toBe(undefined);
        db.close();
    });

    test(".distinct() removes duplicates", () => {
        const db = connect(Database(":memory:"));
        const items = defineTable("items", { id: { type: "INT", primaryKey: true }, category: { type: "TEXT" } });
        db.createTable(items);
        db.from(items).insert({ id: 1, category: "A" }).exec();
        db.from(items).insert({ id: 2, category: "A" }).exec();
        db.from(items).insert({ id: 3, category: "B" }).exec();
        const result = db.from(items).select("category").distinct().toArray();
        expect(result.length).toBe(2);
        db.close();
    });

    test(".first() returns single object", () => {
        const { db, users } = setup();
        const row = db.from(users).first();
        expect(typeof row).toBe("object");
        expect(row.name).not.toBe(undefined);
        db.close();
    });

    test(".first() returns null on empty", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true } });
        db.createTable(empty);
        const row = db.from(empty).first();
        expect(row).toBe(null);
        db.close();
    });

    test(".firstOrThrow() on empty throws", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true } });
        db.createTable(empty);
        let threw = false;
        try {
            db.from(empty).firstOrThrow();
        } catch (e) {
            threw = true;
        }
        expect(threw).toBe(true);
        db.close();
    });

    test(".count() returns number", () => {
        const { db, users } = setup();
        const count = db.from(users).count();
        expect(typeof count).toBe("number");
        expect(count).toBe(5);
        db.close();
    });

    test(".exists() returns true/false", () => {
        const { db, users } = setup();
        expect(db.from(users).exists()).toBe(true);
        db.close();
    });

    test(".toSQL() returns SELECT string", () => {
        const { db, users } = setup();
        const sql = db.from(users).toSQL();
        expect(sql.includes("SELECT")).toBe(true);
        db.close();
    });

    test(".toArray() result length matches inserted rows", () => {
        const { db, users } = setup();
        const result = db.from(users).toArray();
        expect(result.length).toBe(5);
        db.close();
    });

    test("Multiple .toArray() calls return same results", () => {
        const { db, users } = setup();
        const q = db.from(users);
        const r1 = q.toArray();
        const r2 = q.toArray();
        expect(r1.length).toBe(r2.length);
        db.close();
    });

    test("select() is immutable (original query unchanged)", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const narrow = base.select("name");
        const baseFields = base.toPlan().fields;
        const narrowFields = narrow.toPlan().fields;
        expect(baseFields[0]).toBe("*");
        expect(narrowFields[0]).toBe("name");
        db.close();
    });

    test("Empty table returns []", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true } });
        db.createTable(empty);
        const result = db.from(empty).toArray();
        expect(result.length).toBe(0);
        db.close();
    });

    test("count() on empty returns 0", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true } });
        db.createTable(empty);
        expect(db.from(empty).count()).toBe(0);
        db.close();
    });

    test("exists() on empty returns false", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true } });
        db.createTable(empty);
        expect(db.from(empty).exists()).toBe(false);
        db.close();
    });

    test("toSQL() includes table name", () => {
        const { db, users } = setup();
        const sql = db.from(users).toSQL();
        expect(sql.includes("users")).toBe(true);
        db.close();
    });

    test("toSQL() includes selected fields", () => {
        const { db, users } = setup();
        const sql = db.from(users).select("name", "age").toSQL();
        expect(sql.includes("name")).toBe(true);
        expect(sql.includes("age")).toBe(true);
        db.close();
    });

    test("Preserves insertion order", () => {
        const { db, users } = setup();
        const result = db.from(users).toArray();
        expect(result[0].name).toBe("Alice");
        expect(result[4].name).toBe("Eve");
        db.close();
    });
});
