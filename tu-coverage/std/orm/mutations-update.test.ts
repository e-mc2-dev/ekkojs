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

describe("ekko:orm — Mutations UPDATE (Deep)", () => {
    test("Update single field", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ age: 31 }).exec();
        expect(db.from(users).where({ id: 1 }).first().age).toBe(31);
        db.close();
    });

    test("Update multiple fields", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ name: "AliceNew", age: 31 }).exec();
        const row = db.from(users).where({ id: 1 }).first();
        expect(row.name).toBe("AliceNew");
        expect(row.age).toBe(31);
        db.close();
    });

    test("Update with where = targets one row", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 3 }).update({ name: "CharlieX" }).exec();
        expect(db.from(users).where({ id: 3 }).first().name).toBe("CharlieX");
        expect(db.from(users).where({ id: 1 }).first().name).toBe("Alice");
        expect(db.from(users).where({ id: 2 }).first().name).toBe("Bob");
        db.close();
    });

    test("Update with whereGt targets multiple rows", () => {
        const { db, users } = setup();
        db.from(users).where(u => u.age.gt(27)).update({ email: "updated@t.com" }).exec();
        
        const updated = db.from(users).where({ email: "updated@t.com" }).toArray();
        expect(updated.length).toBe(3);
        db.close();
    });

    test("Update doesn't affect rows outside where", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ name: "CHANGED" }).exec();
        const others = db.from(users).where(u => u.id.gt(1)).toArray();
        for (const row of others) {
            expect(row.name === "CHANGED").toBe(false);
        }
        db.close();
    });

    test("Update returns affectedRows", () => {
        const { db, users } = setup();
        const result = db.from(users).where({ id: 1 }).update({ age: 99 }).exec();
        expect(result.affectedRows).toBe(1);
        db.close();
    });

    test("Updated value verified with first()", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 2 }).update({ name: "BobUpdated" }).exec();
        const row = db.from(users).where({ id: 2 }).first();
        expect(row.name).toBe("BobUpdated");
        db.close();
    });

    test("Update string field", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ email: "newalice@test.com" }).exec();
        expect(db.from(users).where({ id: 1 }).first().email).toBe("newalice@test.com");
        db.close();
    });

    test("Update number field", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 4 }).update({ age: 77 }).exec();
        expect(db.from(users).where({ id: 4 }).first().age).toBe(77);
        db.close();
    });

    test("Update to zero", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ age: 0 }).exec();
        expect(db.from(users).where({ id: 1 }).first().age).toBe(0);
        db.close();
    });

    test("Update to empty string", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ name: "" }).exec();
        expect(db.from(users).where({ id: 1 }).first().name).toBe("");
        db.close();
    });

    test("Update to large number", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ age: 9999999 }).exec();
        expect(db.from(users).where({ id: 1 }).first().age).toBe(9999999);
        db.close();
    });

    test("Update all rows (no where)", () => {
        const { db, users } = setup();
        db.from(users).update({ age: 50 }).exec();
        const all = db.from(users).toArray();
        for (const row of all) {
            expect(row.age).toBe(50);
        }
        db.close();
    });

    test("Update + count unchanged", () => {
        const { db, users } = setup();
        const before = db.from(users).count();
        db.from(users).where({ id: 1 }).update({ name: "X" }).exec();
        const after = db.from(users).count();
        expect(after).toBe(before);
        db.close();
    });

    test("Sequential updates on same row", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ age: 40 }).exec();
        db.from(users).where({ id: 1 }).update({ age: 50 }).exec();
        db.from(users).where({ id: 1 }).update({ age: 60 }).exec();
        expect(db.from(users).where({ id: 1 }).first().age).toBe(60);
        db.close();
    });

    test("Update same field twice — last wins", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 2 }).update({ name: "First" }).exec();
        db.from(users).where({ id: 2 }).update({ name: "Second" }).exec();
        expect(db.from(users).where({ id: 2 }).first().name).toBe("Second");
        db.close();
    });

    test("Update different fields in sequence", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 3 }).update({ name: "C3" }).exec();
        db.from(users).where({ id: 3 }).update({ age: 99 }).exec();
        const row = db.from(users).where({ id: 3 }).first();
        expect(row.name).toBe("C3");
        expect(row.age).toBe(99);
        db.close();
    });

    test("Update with where matching 0 rows — no error, 0 affected", () => {
        const { db, users } = setup();
        const result = db.from(users).where({ id: 999 }).update({ name: "Nobody" }).exec();
        expect(result.affectedRows).toBe(0);
        expect(db.from(users).count()).toBe(5);
        db.close();
    });

    test("Update with whereLike", () => {
        const { db, users } = setup();
        db.from(users).where(u => u.name.like("%li%")).update({ age: 88 }).exec();
        
        expect(db.from(users).where({ id: 1 }).first().age).toBe(88);
        expect(db.from(users).where({ id: 3 }).first().age).toBe(88);
        
        expect(db.from(users).where({ id: 2 }).first().age).toBe(25);
        db.close();
    });

    test("Update + rollback in transaction = reverts", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).where({ id: 1 }).update({ age: 999 }).exec();
                throw new Error("revert");
            });
        } catch (e) {
            
        }
        expect(db.from(users).where({ id: 1 }).first().age).toBe(30);
        db.close();
    });

    test("toSQL for update includes SET and WHERE", () => {
        const { db, users } = setup();
        const sql = db.from(users).where({ id: 1 }).update({ name: "X" }).toSQL();
        expect(sql.includes("UPDATE")).toBe(true);
        expect(sql.includes("SET")).toBe(true);
        expect(sql.includes("WHERE")).toBe(true);
        db.close();
    });

    test("Update preserves other fields (only changes specified)", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ age: 99 }).exec();
        const row = db.from(users).where({ id: 1 }).first();
        expect(row.name).toBe("Alice");
        expect(row.email).toBe("alice@test.com");
        expect(row.age).toBe(99);
        db.close();
    });

    test("Update with special chars in value", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ name: "O'Malley \"Jr\"" }).exec();
        expect(db.from(users).where({ id: 1 }).first().name).toBe("O'Malley \"Jr\"");
        db.close();
    });

    test("Update then verify with toArray", () => {
        const { db, users } = setup();
        db.from(users).where(u => u.age.gt(27)).update({ email: "bulk@t.com" }).exec();
        const results = db.from(users).where({ email: "bulk@t.com" }).toArray();
        
        expect(results.length).toBe(3);
        db.close();
    });

    test("Multiple updates on different rows in sequence", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).update({ age: 100 }).exec();
        db.from(users).where({ id: 2 }).update({ age: 200 }).exec();
        db.from(users).where({ id: 3 }).update({ age: 300 }).exec();
        db.from(users).where({ id: 4 }).update({ age: 400 }).exec();
        db.from(users).where({ id: 5 }).update({ age: 500 }).exec();
        expect(db.from(users).where({ id: 1 }).first().age).toBe(100);
        expect(db.from(users).where({ id: 2 }).first().age).toBe(200);
        expect(db.from(users).where({ id: 3 }).first().age).toBe(300);
        expect(db.from(users).where({ id: 4 }).first().age).toBe(400);
        expect(db.from(users).where({ id: 5 }).first().age).toBe(500);
        db.close();
    });
});
