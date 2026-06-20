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

describe("ekko:orm — Mutations (INSERT/UPDATE/DELETE)", () => {
    test(".insert({...}).exec() adds row", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Frank", email: "frank@test.com", age: 40 }).exec();
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.name).toBe("Frank");
        db.close();
    });

    test("After insert, count increases", () => {
        const { db, users } = setup();
        const before = db.from(users).count();
        db.from(users).insert({ id: 10, name: "Frank", email: "frank@test.com", age: 40 }).exec();
        const after = db.from(users).count();
        expect(after).toBe(before + 1);
        db.close();
    });

    test("Insert data retrievable with where", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "Zara", email: "zara@test.com", age: 19 }).exec();
        const result = db.from(users).where({ name: "Zara" }).toArray();
        expect(result.length).toBe(1);
        expect(result[0].age).toBe(19);
        db.close();
    });

    test("Insert returns {affectedRows}", () => {
        const { db, users } = setup();
        const result = db.from(users).insert({ id: 10, name: "Frank", email: "frank@test.com", age: 40 }).exec();
        expect(result.affectedRows).toBe(1);
        db.close();
    });

    test(".update({age:31}).exec() modifies row", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ age: 31 }).exec();
        const row = db.from(users).where({ id: 1 }).first();
        expect(row.age).toBe(31);
        db.close();
    });

    test("Update with where targets specific row", () => {
        const { db, users } = setup();
        db.from(users).where({ name: "Bob" }).update({ age: 99 }).exec();
        const bob = db.from(users).where({ name: "Bob" }).first();
        const alice = db.from(users).where({ name: "Alice" }).first();
        expect(bob.age).toBe(99);
        expect(alice.age).toBe(30);
        db.close();
    });

    test("Updated value visible in subsequent query", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 3 }).update({ email: "new@test.com" }).exec();
        const row = db.from(users).where({ id: 3 }).first();
        expect(row.email).toBe("new@test.com");
        db.close();
    });

    test("Update doesn't affect other rows", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ name: "UPDATED" }).exec();
        const others = db.from(users).where(u => u.id.gt(1)).toArray();
        for (const row of others) {
            expect(row.name === "UPDATED").toBe(false);
        }
        db.close();
    });

    test(".delete().exec() removes row", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).delete().exec();
        const row = db.from(users).where({ id: 1 }).first();
        expect(row).toBe(null);
        db.close();
    });

    test("Delete with where targets specific row", () => {
        const { db, users } = setup();
        db.from(users).where({ name: "Eve" }).delete().exec();
        expect(db.from(users).where({ name: "Eve" }).exists()).toBe(false);
        expect(db.from(users).where({ name: "Alice" }).exists()).toBe(true);
        db.close();
    });

    test("After delete, count decreases", () => {
        const { db, users } = setup();
        const before = db.from(users).count();
        db.from(users).where({ id: 2 }).delete().exec();
        const after = db.from(users).count();
        expect(after).toBe(before - 1);
        db.close();
    });

    test("Delete without where removes all", () => {
        const { db, users } = setup();
        db.from(users).delete().exec();
        const count = db.from(users).count();
        expect(count).toBe(0);
        db.close();
    });

    test("Insert + update + verify cycle", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 20, name: "X", email: "x@t.com", age: 1 }).exec();
        db.from(users).where({ id: 20 }).update({ age: 100 }).exec();
        const row = db.from(users).where({ id: 20 }).first();
        expect(row.age).toBe(100);
        db.close();
    });

    test("Insert + delete + verify cycle", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 20, name: "Temp", email: "t@t.com", age: 1 }).exec();
        db.from(users).where({ id: 20 }).delete().exec();
        expect(db.from(users).where({ id: 20 }).exists()).toBe(false);
        db.close();
    });

    test("toSQL for insert contains INSERT", () => {
        const { db, users } = setup();
        const sql = db.from(users).insert({ id: 10, name: "X" }).toSQL();
        expect(sql.includes("INSERT")).toBe(true);
        db.close();
    });

    test("toSQL for update contains UPDATE", () => {
        const { db, users } = setup();
        const sql = db.from(users).where({ id: 1 }).update({ name: "Y" }).toSQL();
        expect(sql.includes("UPDATE")).toBe(true);
        db.close();
    });

    test("toSQL for delete contains DELETE", () => {
        const { db, users } = setup();
        const sql = db.from(users).where({ id: 1 }).delete().toSQL();
        expect(sql.includes("DELETE")).toBe(true);
        db.close();
    });

    test("Multiple inserts in sequence", () => {
        const { db, users } = setup();
        db.from(users).insert({ id: 10, name: "A", email: "a@t.com", age: 10 }).exec();
        db.from(users).insert({ id: 11, name: "B", email: "b@t.com", age: 11 }).exec();
        db.from(users).insert({ id: 12, name: "C", email: "c@t.com", age: 12 }).exec();
        expect(db.from(users).count()).toBe(8);
        db.close();
    });

    test("Multiple updates in sequence", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ age: 100 }).exec();
        db.from(users).where({ id: 2 }).update({ age: 200 }).exec();
        expect(db.from(users).where({ id: 1 }).first().age).toBe(100);
        expect(db.from(users).where({ id: 2 }).first().age).toBe(200);
        db.close();
    });

    test("Full CRUD cycle", () => {
        const { db, users } = setup();
        
        db.from(users).insert({ id: 99, name: "CRUD", email: "crud@t.com", age: 50 }).exec();
        expect(db.from(users).where({ id: 99 }).exists()).toBe(true);
        
        const row = db.from(users).where({ id: 99 }).first();
        expect(row.name).toBe("CRUD");
        
        db.from(users).where({ id: 99 }).update({ name: "UPDATED" }).exec();
        expect(db.from(users).where({ id: 99 }).first().name).toBe("UPDATED");
        
        db.from(users).where({ id: 99 }).delete().exec();
        expect(db.from(users).where({ id: 99 }).exists()).toBe(false);
        db.close();
    });
});
