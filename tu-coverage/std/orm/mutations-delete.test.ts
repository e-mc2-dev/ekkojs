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

describe("ekko:orm — Mutations DELETE (Deep)", () => {
    test("Delete with where removes specific row", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 3 }).delete().exec();
        expect(db.from(users).where({ id: 3 }).first()).toBe(null);
        db.close();
    });

    test("Delete returns affectedRows", () => {
        const { db, users } = setup();
        const result = db.from(users).where({ id: 1 }).delete().exec();
        expect(result.affectedRows).toBe(1);
        db.close();
    });

    test("Deleted row not findable", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 2 }).delete().exec();
        expect(db.from(users).where({ id: 2 }).exists()).toBe(false);
        expect(db.from(users).where({ name: "Bob" }).first()).toBe(null);
        db.close();
    });

    test("Count decreases by 1", () => {
        const { db, users } = setup();
        const before = db.from(users).count();
        db.from(users).where({ id: 4 }).delete().exec();
        expect(db.from(users).count()).toBe(before - 1);
        db.close();
    });

    test("Delete with whereGt removes multiple", () => {
        const { db, users } = setup();
        db.from(users).where(u => u.age.gt(27)).delete().exec();
        
        expect(db.from(users).count()).toBe(2);
        expect(db.from(users).where({ id: 2 }).exists()).toBe(true);
        expect(db.from(users).where({ id: 5 }).exists()).toBe(true);
        db.close();
    });

    test("Delete all (no where) empties table", () => {
        const { db, users } = setup();
        db.from(users).delete().exec();
        expect(db.from(users).count()).toBe(0);
        expect(db.from(users).toArray().length).toBe(0);
        db.close();
    });

    test("Delete with whereIn removes matching", () => {
        const { db, users } = setup();
        db.from(users).where(u => u.id.isIn([1, 3, 5])).delete().exec();
        expect(db.from(users).count()).toBe(2);
        expect(db.from(users).where({ id: 2 }).exists()).toBe(true);
        expect(db.from(users).where({ id: 4 }).exists()).toBe(true);
        db.close();
    });

    test("Delete with whereLike", () => {
        const { db, users } = setup();
        db.from(users).where(u => u.name.like("%li%")).delete().exec();
        
        expect(db.from(users).count()).toBe(3);
        expect(db.from(users).where({ name: "Alice" }).exists()).toBe(false);
        expect(db.from(users).where({ name: "Charlie" }).exists()).toBe(false);
        db.close();
    });

    test("Delete 0 rows (where matches nothing) — no error", () => {
        const { db, users } = setup();
        const result = db.from(users).where({ id: 999 }).delete().exec();
        expect(result.affectedRows).toBe(0);
        expect(db.from(users).count()).toBe(5);
        db.close();
    });

    test("Delete then insert same ID", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).delete().exec();
        expect(db.from(users).where({ id: 1 }).exists()).toBe(false);
        db.from(users).insert({ id: 1, name: "NewAlice", email: "new@t.com", age: 99 }).exec();
        const row = db.from(users).where({ id: 1 }).first();
        expect(row.name).toBe("NewAlice");
        expect(row.age).toBe(99);
        db.close();
    });

    test("Delete + verify remaining with toArray", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).delete().exec();
        db.from(users).where({ id: 3 }).delete().exec();
        const remaining = db.from(users).orderBy("id").toArray();
        expect(remaining.length).toBe(3);
        expect(remaining[0].id).toBe(2);
        expect(remaining[1].id).toBe(4);
        expect(remaining[2].id).toBe(5);
        db.close();
    });

    test("Sequential deletes", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).delete().exec();
        expect(db.from(users).count()).toBe(4);
        db.from(users).where({ id: 2 }).delete().exec();
        expect(db.from(users).count()).toBe(3);
        db.from(users).where({ id: 3 }).delete().exec();
        expect(db.from(users).count()).toBe(2);
        db.close();
    });

    test("Delete last row — table empty", () => {
        const db = connect(Database(":memory:"));
        const single = defineTable("single", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        db.createTable(single);
        db.from(single).insert({ id: 1, val: "only" }).exec();
        expect(db.from(single).count()).toBe(1);
        db.from(single).where({ id: 1 }).delete().exec();
        expect(db.from(single).count()).toBe(0);
        expect(db.from(single).first()).toBe(null);
        db.close();
    });

    test("Delete first row — others unchanged", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 1 }).delete().exec();
        const remaining = db.from(users).orderBy("id").toArray();
        expect(remaining[0].id).toBe(2);
        expect(remaining[0].name).toBe("Bob");
        expect(remaining[1].id).toBe(3);
        expect(remaining[1].name).toBe("Charlie");
        db.close();
    });

    test("Delete middle row — others unchanged", () => {
        const { db, users } = setup();
        db.from(users).where({ id: 3 }).delete().exec();
        expect(db.from(users).where({ id: 1 }).first().name).toBe("Alice");
        expect(db.from(users).where({ id: 2 }).first().name).toBe("Bob");
        expect(db.from(users).where({ id: 4 }).first().name).toBe("Diana");
        expect(db.from(users).where({ id: 5 }).first().name).toBe("Eve");
        db.close();
    });

    test("Delete + count in sequence", () => {
        const { db, users } = setup();
        expect(db.from(users).count()).toBe(5);
        db.from(users).where({ id: 5 }).delete().exec();
        expect(db.from(users).count()).toBe(4);
        db.from(users).where({ id: 4 }).delete().exec();
        expect(db.from(users).count()).toBe(3);
        db.from(users).where({ id: 3 }).delete().exec();
        expect(db.from(users).count()).toBe(2);
        db.close();
    });

    test("Delete + exists = false", () => {
        const { db, users } = setup();
        expect(db.from(users).where({ id: 2 }).exists()).toBe(true);
        db.from(users).where({ id: 2 }).delete().exec();
        expect(db.from(users).where({ id: 2 }).exists()).toBe(false);
        db.close();
    });

    test("Delete in transaction + commit = gone", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).where({ id: 1 }).delete().exec();
        });
        expect(db.from(users).where({ id: 1 }).exists()).toBe(false);
        db.close();
    });

    test("Delete in transaction + rollback = still there", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).where({ id: 1 }).delete().exec();
                throw new Error("rollback");
            });
        } catch (e) {
            
        }
        expect(db.from(users).where({ id: 1 }).exists()).toBe(true);
        expect(db.from(users).where({ id: 1 }).first().name).toBe("Alice");
        db.close();
    });

    test("toSQL for delete includes WHERE", () => {
        const { db, users } = setup();
        const sql = db.from(users).where({ id: 1 }).delete().toSQL();
        expect(sql.includes("DELETE")).toBe(true);
        expect(sql.includes("WHERE")).toBe(true);
        db.close();
    });
});
