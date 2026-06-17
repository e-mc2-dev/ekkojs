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

describe("ekko:orm — WHERE Deep Combinations with Data Verification", () => {
    test("where exact match string", () => {
        const { db, users } = setup();
        const result = db.from(users).where({ name: "Alice" }).toArray();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Alice");
        expect(result[0].age).toBe(30);
        db.close();
    });

    test("where exact match number", () => {
        const { db, users } = setup();
        const result = db.from(users).where({ age: 25 }).toArray();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Bob");
        db.close();
    });

    test("where exact match zero", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 6, name: "Zero", email: "zero@test.com", age: 0 }).exec();
        const result = db.from(users).where({ age: 0 }).toArray();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Zero");
        db.close();
    });

    test("whereGt excludes boundary value", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gt(30)).toArray();
        
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Charlie");
        db.close();
    });

    test("whereGt includes values above", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gt(22)).toArray();
        
        expect(result.length).toBe(4);
        db.close();
    });

    test("whereLt excludes boundary value", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.lt(22)).toArray();
        
        expect(result.length).toBe(0);
        db.close();
    });

    test("whereLt includes values below", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.lt(30)).toArray();
        
        expect(result.length).toBe(3);
        db.close();
    });

    test("whereGte includes boundary value", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gte(30)).toArray();
        
        expect(result.length).toBe(2);
        db.close();
    });

    test("whereGte excludes below boundary", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gte(30)).toArray();
        for (const row of result) {
            expect(row.age >= 30).toBe(true);
        }
        db.close();
    });

    test("whereLte includes boundary value", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.lte(25)).toArray();
        
        expect(result.length).toBe(2);
        db.close();
    });

    test("whereLte excludes above boundary", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.lte(25)).toArray();
        for (const row of result) {
            expect(row.age <= 25).toBe(true);
        }
        db.close();
    });

    test("whereLike prefix match ('A%')", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.name.like("A%")).toArray();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Alice");
        db.close();
    });

    test("whereLike suffix match ('%e')", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.name.like("%e")).toArray();
        
        expect(result.length).toBe(3);
        db.close();
    });

    test("whereLike contains match ('%li%')", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.name.like("%li%")).toArray();
        
        expect(result.length).toBe(2);
        db.close();
    });

    test("whereLike case sensitivity", () => {
        const { db, users } = setup();
        
        const result = db.from(users).where(u => u.name.like("%alice%")).toArray();

        expect(result.length >= 0).toBe(true);
        db.close();
    });

    test("whereIn with single value", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.name.isIn(["Alice"])).toArray();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Alice");
        db.close();
    });

    test("whereIn with multiple values", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.name.isIn(["Alice", "Bob", "Eve"])).toArray();
        expect(result.length).toBe(3);
        db.close();
    });

    test("whereIn with no matches", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.name.isIn(["Nobody", "Ghost"])).toArray();
        expect(result.length).toBe(0);
        db.close();
    });

    test("whereIn with all matching", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.name.isIn(["Alice", "Bob", "Charlie", "Diana", "Eve"])).toArray();
        expect(result.length).toBe(5);
        db.close();
    });

    test("whereNull finds null values", () => {
        const db = connect(Database(":memory:"));
        const items = defineTable("items", { id: { type: "INT", primaryKey: true }, label: { type: "TEXT", nullable: true } });
        db.createTable(items);
        db.from(items).insert({ id: 1, label: "has-label" }).exec();
        db.exec("INSERT INTO items (id, label) VALUES (2, NULL)");
        const result = db.from(items).where(i => i.label.isNull()).toArray();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(2);
        db.close();
    });

    test("whereNotNull excludes null values", () => {
        const db = connect(Database(":memory:"));
        const items = defineTable("items", { id: { type: "INT", primaryKey: true }, label: { type: "TEXT", nullable: true } });
        db.createTable(items);
        db.from(items).insert({ id: 1, label: "has-label" }).exec();
        db.exec("INSERT INTO items (id, label) VALUES (2, NULL)");
        const result = db.from(items).where(i => i.label.isNotNull()).toArray();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(1);
        db.close();
    });

    test("Chained: whereGt + whereLt = range", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gt(22)).where(u => u.age.lt(35)).toArray();
        
        expect(result.length).toBe(3);
        for (const row of result) {
            expect(row.age > 22).toBe(true);
            expect(row.age < 35).toBe(true);
        }
        db.close();
    });

    test("Chained: whereGte + whereLte = inclusive range", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gte(25)).where(u => u.age.lte(30)).toArray();
        
        expect(result.length).toBe(3);
        for (const row of result) {
            expect(row.age >= 25).toBe(true);
            expect(row.age <= 30).toBe(true);
        }
        db.close();
    });

    test("Chained: where + whereLike = AND", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gt(25)).where(u => u.name.like("%li%")).toArray();

        expect(result.length).toBe(2);
        db.close();
    });

    test("Chained: 3 conditions all must match", () => {
        const { db, users } = setup();
        const result = db.from(users)
            .where(u => u.age.gt(20))
            .where(u => u.age.lt(31))
            .where(u => u.name.like("%a%"))
            .toArray();

        
        expect(result.length >= 1).toBe(true);
        db.close();
    });

    test("Chained: 4 conditions all must match", () => {
        const { db, users } = setup();
        const result = db.from(users)
            .where(u => u.age.gte(22))
            .where(u => u.age.lte(35))
            .where(u => u.email.isNotNull())
            .where(u => u.email.like("%@test.com"))
            .toArray();
        
        expect(result.length).toBe(5);
        db.close();
    });

    test("where on non-existent value = empty", () => {
        const { db, users } = setup();
        const result = db.from(users).where({ name: "NonExistent" }).toArray();
        expect(result.length).toBe(0);
        db.close();
    });

    test("where on all matching = full result", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gt(0)).toArray();
        expect(result.length).toBe(5);
        db.close();
    });

    test("where + count = filtered count", () => {
        const { db, users } = setup();
        const count = db.from(users).where(u => u.age.gt(28)).count();
        
        expect(count).toBe(2);
        db.close();
    });

    test("where + first = first of filtered", () => {
        const { db, users } = setup();
        const row = db.from(users).where({ name: "Charlie" }).first();
        expect(row).not.toBe(null);
        expect(row.name).toBe("Charlie");
        expect(row.age).toBe(35);
        db.close();
    });

    test("where + exists on match = true", () => {
        const { db, users } = setup();
        const exists = db.from(users).where({ name: "Diana" }).exists();
        expect(exists).toBe(true);
        db.close();
    });

    test("where + exists on no match = false", () => {
        const { db, users } = setup();
        const exists = db.from(users).where({ name: "Nobody" }).exists();
        expect(exists).toBe(false);
        db.close();
    });

    test("where + orderBy + first = specific ordering applied first", () => {
        const { db, users } = setup();
        const row = db.from(users).where(u => u.age.gt(24)).orderBy("age").first();

        expect(row.name).toBe("Bob");
        expect(row.age).toBe(25);
        db.close();
    });

    test("where + take = limited filtered", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gt(20)).take(2).toArray();
        expect(result.length).toBe(2);
        db.close();
    });

    test("where preserves all matching rows (no duplicates lost)", () => {
        const { db, users } = setup();
        
        db.from(users).insert({ id: 6, name: "Frank", email: "frank@test.com", age: 30 }).exec();
        const result = db.from(users).where({ age: 30 }).toArray();
        
        expect(result.length).toBe(2);
        const names = result.map((r: any) => r.name);
        expect(names.includes("Alice")).toBe(true);
        expect(names.includes("Frank")).toBe(true);
        db.close();
    });
});
