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

describe("ekko:orm — Aggregates", () => {
    test(".count() total rows", () => {
        const { db, users } = setup();
        expect(db.from(users).count()).toBe(5);
        db.close();
    });

    test(".count() with where", () => {
        const { db, users } = setup();
        expect(db.from(users).where(u => u.age.gt(28)).count()).toBe(2); 
        db.close();
    });

    test(".sum('age') all rows", () => {
        const { db, users } = setup();
        
        expect(db.from(users).sum("age")).toBe(140);
        db.close();
    });

    test(".sum('age') with where", () => {
        const { db, users } = setup();
        
        expect(db.from(users).where(u => u.age.gt(28)).sum("age")).toBe(65);
        db.close();
    });

    test(".avg('age') average", () => {
        const { db, users } = setup();
        
        expect(db.from(users).avg("age")).toBe(28);
        db.close();
    });

    test(".min('age') minimum", () => {
        const { db, users } = setup();
        expect(db.from(users).min("age")).toBe(22);
        db.close();
    });

    test(".max('age') maximum", () => {
        const { db, users } = setup();
        expect(db.from(users).max("age")).toBe(35);
        db.close();
    });

    test("Aggregate on empty returns 0 or null", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true }, val: { type: "INT" } });
        db.createTable(empty);
        expect(db.from(empty).count()).toBe(0);
        const sum = db.from(empty).sum("val");
        expect(sum === 0 || sum === null).toBe(true);
        db.close();
    });

    test("count after insert reflects new count", () => {
        const { db, users } = setup();
        expect(db.from(users).count()).toBe(5);
        db.from(users).insert({ id: 10, name: "New", email: "new@t.com", age: 50 }).exec();
        expect(db.from(users).count()).toBe(6);
        db.close();
    });

    test("min/max return correct extremes", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Young", email: "y@t.com", age: 1 }).exec();
        db.from(users).insert({ id: 11, name: "Old", email: "o@t.com", age: 99 }).exec();
        expect(db.from(users).min("age")).toBe(1);
        expect(db.from(users).max("age")).toBe(99);
        db.close();
    });

    test("Multiple aggregates on same table (different queries)", () => {
        const { db, users } = setup();
        const count = db.from(users).count();
        const sum = db.from(users).sum("age");
        const min = db.from(users).min("age");
        const max = db.from(users).max("age");
        expect(count).toBe(5);
        expect(sum).toBe(140);
        expect(min).toBe(22);
        expect(max).toBe(35);
        db.close();
    });

    test("Aggregate + where combined", () => {
        const { db, users } = setup();
        
        const sum = db.from(users).where(u => u.age.gte(25)).where(u => u.age.lte(30)).sum("age");
        expect(sum).toBe(83);
        db.close();
    });
});
