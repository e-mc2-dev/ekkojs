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

describe("ekko:orm — Mutations INSERT (Deep)", () => {
    test("Insert single row", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Frank", email: "frank@test.com", age: 40 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row).not.toBe(null);
        expect(row.name).toBe("Frank");
        db.close();
    });

    test("Insert with all fields", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Full", email: "full@test.com", age: 55 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.id).toBe(10);
        expect(row.name).toBe("Full");
        expect(row.email).toBe("full@test.com");
        expect(row.age).toBe(55);
        db.close();
    });

    test("Insert with minimal fields (nullable schema)", () => {
        const db = connect(Database(":memory:"));
        const items = defineTable("items", { id: { type: "INT", primaryKey: true }, name: { type: "TEXT" }, note: { type: "TEXT", nullable: true } });
        db.createTable(items);
        db.from(items).insert({ id: 1, name: "Minimal" }).exec();
        const row = db.from(items).where({ id: 1 }).first();
        expect(row).not.toBe(null);
        expect(row.name).toBe("Minimal");
        db.close();
    });

    test("Insert returns affectedRows", () => {
        const { db, users } = setup();
        const result = db.from(users).insert({ id: 10, name: "Affected", email: "a@t.com", age: 10 }).exec();
        expect(result.affectedRows).toBe(1);
        db.close();
    });

    test("Inserted row findable with where", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Findable", email: "find@t.com", age: 33 }).exec();
        const result = db.from(users).where({ name: "Findable" }).toArray();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(10);
        db.close();
    });

    test("Insert with string value", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "StringTest", email: "hello world", age: 1 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.email).toBe("hello world");
        db.close();
    });

    test("Insert with number value", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "NumTest", email: "n@t.com", age: 42 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.age).toBe(42);
        db.close();
    });

    test("Insert with zero value", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Zero", email: "z@t.com", age: 0 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.age).toBe(0);
        db.close();
    });

    test("Insert with empty string", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "", email: "", age: 1 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.name).toBe("");
        expect(row.email).toBe("");
        db.close();
    });

    test("Insert with negative number", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Neg", email: "neg@t.com", age: -5 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.age).toBe(-5);
        db.close();
    });

    test("Insert with large number (1000000)", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Large", email: "l@t.com", age: 1000000 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.age).toBe(1000000);
        db.close();
    });

    test("Insert with special chars in string (quotes, backslash)", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "O'Brien", email: "ob\\test@t.com", age: 30 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.name).toBe("O'Brien");
        expect(row.email).toBe("ob\\test@t.com");
        db.close();
    });

    test("Insert 10 rows sequentially", () => {
        const { db, users } = setup();
        for (let i = 10; i < 20; i++) {
            db.from(users).insert({ id: i, name: "Row" + i, email: i + "@t.com", age: i }).exec();
        }
        expect(db.from(users).count()).toBe(15);
        db.close();
    });

    test("Insert 50 rows sequentially — all findable", () => {
        const { db, users } = setup();
        for (let i = 100; i < 150; i++) {
            db.from(users).insert({ id: i, name: "Batch" + i, email: i + "@t.com", age: i }).exec();
        }
        expect(db.from(users).count()).toBe(55);
        for (let i = 100; i < 150; i++) {
            expect(db.from(users).where({ id: i }).exists()).toBe(true);
        }
        db.close();
    });

    test("Count increases by 1 per insert", () => {
        const { db, users } = setup();
        for (let i = 10; i < 15; i++) {
            const before = db.from(users).count();
            db.from(users).insert({ id: i, name: "Inc" + i, email: i + "@t.com", age: i }).exec();
            const after = db.from(users).count();
            expect(after).toBe(before + 1);
        }
        db.close();
    });

    test("Insert preserves exact values (roundtrip verify)", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Exact", email: "exact@test.com", age: 77 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.id).toBe(10);
        expect(row.name).toBe("Exact");
        expect(row.email).toBe("exact@test.com");
        expect(row.age).toBe(77);
        db.close();
    });

    test("Insert with same data twice (no unique constraint on non-PK)", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Dup", email: "dup@t.com", age: 20 }).exec();
        db.from(users).insert({ id: 11, name: "Dup", email: "dup@t.com", age: 20 }).exec();
        const results = db.from(users).where({ name: "Dup" }).toArray();
        expect(results.length).toBe(2);
        db.close();
    });

    test("Insert after delete of same ID", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).delete().exec();
        expect(db.from(users).where({ id: 1 }).exists()).toBe(false);
        db.from(users).insert({ id: 1, name: "Reborn", email: "reborn@t.com", age: 1 }).exec();
        const row = db.from(users).where({ id: 1 }).first();
        expect(row.name).toBe("Reborn");
        db.close();
    });

    test("toSQL for insert has correct structure", () => {
        const { db, users } = setup();
        const sql = db.from(users).insert({ id: 10, name: "X", email: "x@t.com", age: 10 }).toSQL();
        expect(sql.includes("INSERT")).toBe(true);
        expect(sql.includes("users")).toBe(true);
        db.close();
    });

    test("Insert + immediate read = consistent", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Immediate", email: "im@t.com", age: 10 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.name).toBe("Immediate");
        db.close();
    });

    test("Bulk insert pattern: loop + exec each", () => {
        const { db, users } = setup();
        const names = ["X1", "X2", "X3", "X4", "X5"];
        for (let i = 0; i < names.length; i++) {
            db.from(users).insert({ id: 100 + i, name: names[i], email: names[i] + "@t.com", age: 20 + i }).exec();
        }
        expect(db.from(users).count()).toBe(10);
        expect(db.from(users).where({ name: "X3" }).first().id).toBe(102);
        db.close();
    });

    test("Insert doesn't affect other tables", () => {
        const db = connect(Database(":memory:"));
        const t1 = defineTable("table1", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        const t2 = defineTable("table2", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        db.createTable(t1);
        db.createTable(t2);
        db.from(t1).insert({ id: 1, val: "A" }).exec();
        db.from(t1).insert({ id: 2, val: "B" }).exec();
        expect(db.from(t1).count()).toBe(2);
        expect(db.from(t2).count()).toBe(0);
        db.close();
    });

    test("Insert with all types (INT, TEXT, REAL)", () => {
        const db = connect(Database(":memory:"));
        const mixed = defineTable("mixed", { id: { type: "INT", primaryKey: true }, label: { type: "TEXT" }, score: { type: "REAL" } });
        db.createTable(mixed);
        db.from(mixed).insert({ id: 1, label: "Test", score: 3.14 }).exec();
        const row = db.from(mixed).where({ id: 1 }).first();
        expect(row.id).toBe(1);
        expect(row.label).toBe("Test");
        expect(row.score).toBe(3.14);
        db.close();
    });
});
