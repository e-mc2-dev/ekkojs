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

describe("ekko:orm — Order & Limit", () => {
    test(".orderBy('name') ascending", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("name").toArray();
        expect(result[0].name).toBe("Alice");
        expect(result[1].name).toBe("Bob");
        expect(result[2].name).toBe("Charlie");
        expect(result[3].name).toBe("Diana");
        expect(result[4].name).toBe("Eve");
        db.close();
    });

    test(".orderByDesc('name') descending", () => {
        const { db, users } = setup();
        const result = db.from(users).orderByDesc("name").toArray();
        expect(result[0].name).toBe("Eve");
        expect(result[1].name).toBe("Diana");
        expect(result[2].name).toBe("Charlie");
        expect(result[3].name).toBe("Bob");
        expect(result[4].name).toBe("Alice");
        db.close();
    });

    test(".orderBy('age').first() = youngest", () => {
        const { db, users } = setup();
        const row = db.from(users).orderBy("age").first();
        expect(row.name).toBe("Eve"); 
        db.close();
    });

    test(".orderByDesc('age').first() = oldest", () => {
        const { db, users } = setup();
        const row = db.from(users).orderByDesc("age").first();
        expect(row.name).toBe("Charlie"); 
        db.close();
    });

    test(".take(2) limits results", () => {
        const { db, users } = setup();
        const result = db.from(users).take(2).toArray();
        expect(result.length).toBe(2);
        db.close();
    });

    test(".skip(2).take(10) skips first 2", () => {
        const { db, users } = setup();
        const result = db.from(users).skip(2).take(10).toArray();
        expect(result.length).toBe(3); 
        db.close();
    });

    test("take + orderBy combined", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("age").take(3).toArray();
        expect(result.length).toBe(3);
        expect(result[0].name).toBe("Eve");   
        expect(result[1].name).toBe("Bob");   
        expect(result[2].name).toBe("Diana"); 
        db.close();
    });

    test("take(0) returns empty", () => {
        const { db, users } = setup();
        const result = db.from(users).take(0).toArray();
        expect(result.length).toBe(0);
        db.close();
    });

    test("take(100) returns all", () => {
        const { db, users } = setup();
        const result = db.from(users).take(100).toArray();
        expect(result.length).toBe(5);
        db.close();
    });

    test("skip past end returns empty", () => {
        const { db, users } = setup();
        const result = db.from(users).skip(100).take(10).toArray();
        expect(result.length).toBe(0);
        db.close();
    });

    test("toSQL includes ORDER BY", () => {
        const { db, users } = setup();
        const sql = db.from(users).orderBy("name").toSQL();
        expect(sql.includes("ORDER BY")).toBe(true);
        db.close();
    });

    test("toSQL includes LIMIT", () => {
        const { db, users } = setup();
        const sql = db.from(users).take(5).toSQL();
        expect(sql.includes("LIMIT")).toBe(true);
        db.close();
    });
});
