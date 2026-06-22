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

describe("ekko:orm — WHERE Queries", () => {
    test(".where({name:'Alice'}) filters correctly", () => {
        const { db, users } = setup();
        const result = db.from(users).where({ name: "Alice" }).toArray();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Alice");
        db.close();
    });

    test(".where({age:30}) filters by number", () => {
        const { db, users } = setup();
        const result = db.from(users).where({ age: 30 }).toArray();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Alice");
        db.close();
    });

    test(".whereGt('age', 25) returns > 25", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gt(25)).toArray();
        
        expect(result.length).toBe(3);
        db.close();
    });

    test(".whereLt('age', 30) returns < 30", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.lt(30)).toArray();
        
        expect(result.length).toBe(3);
        db.close();
    });

    test(".whereGte('age', 30) returns >= 30", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gte(30)).toArray();
        
        expect(result.length).toBe(2);
        db.close();
    });

    test(".whereLte('age', 25) returns <= 25", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.lte(25)).toArray();
        
        expect(result.length).toBe(2);
        db.close();
    });

    test(".whereLike('name', '%li%') pattern match", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.name.like("%li%")).toArray();
        
        expect(result.length).toBe(2);
        db.close();
    });

    test(".whereIn('name', ['Alice','Bob']) filters", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.name.isIn(["Alice", "Bob"])).toArray();
        expect(result.length).toBe(2);
        db.close();
    });

    test(".whereNull('label') — find null values with nullable column", () => {
        const db = connect(Database(":memory:"));
        const items = defineTable("items", { id: { type: "INT", primaryKey: true }, label: { type: "TEXT", nullable: true } });
        db.createTable(items);
        db.from(items).insert({ id: 1, label: "visible" }).exec();
        db.exec("INSERT INTO items (id, label) VALUES (2, NULL)");
        const result = db.from(items).where(i => i.label.isNull()).toArray();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(2);
        db.close();
    });

    test(".whereNotNull('name') — find non-null", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.name.isNotNull()).toArray();
        expect(result.length).toBe(5);
        db.close();
    });

    test("Chained wheres are AND", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gt(24)).where(u => u.age.lt(31)).toArray();
        
        expect(result.length).toBe(3);
        db.close();
    });

    test("where + count", () => {
        const { db, users } = setup();
        const count = db.from(users).where(u => u.age.gt(30)).count();
        expect(count).toBe(1); 
        db.close();
    });

    test("where + first", () => {
        const { db, users } = setup();
        const row = db.from(users).where({ name: "Bob" }).first();
        expect(row.age).toBe(25);
        db.close();
    });

    test("where + exists", () => {
        const { db, users } = setup();
        expect(db.from(users).where({ name: "Alice" }).exists()).toBe(true);
        expect(db.from(users).where({ name: "Nobody" }).exists()).toBe(false);
        db.close();
    });

    test("where returns immutable query", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const filtered = base.where({ name: "Alice" });
        expect(base.toPlan().where).toBe(null);
        expect(filtered.toPlan().where).not.toBe(null);
        db.close();
    });

    test("Multiple values in where object (AND)", () => {
        const { db, users } = setup();
        const result = db.from(users).where({ name: "Alice", age: 30 }).toArray();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(1);
        db.close();
    });

    test("where with no matches returns []", () => {
        const { db, users } = setup();
        const result = db.from(users).where({ name: "ZZZ" }).toArray();
        expect(result.length).toBe(0);
        db.close();
    });

    test("toSQL with where includes WHERE", () => {
        const { db, users } = setup();
        const sql = db.from(users).where({ id: 1 }).toSQL();
        expect(sql.includes("WHERE")).toBe(true);
        db.close();
    });

    test("where: age > 25 via proxy", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gt(25)).toArray();
        
        expect(result.length).toBe(3);
        db.close();
    });

    test("Complex: where + orderBy + take", () => {
        const { db, users } = setup();
        const result = db.from(users).where(u => u.age.gt(22)).orderBy("age").take(2).toArray();
        expect(result.length).toBe(2);
        expect(result[0].name).toBe("Bob"); 
        expect(result[1].name).toBe("Diana"); 
        db.close();
    });
});
