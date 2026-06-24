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

describe("ekko:orm — Transaction", () => {
    test("db.transaction is a function", () => {
        const { db } = setup();
        expect(typeof db.transaction).toBe("function");
        db.close();
    });

    test("Transaction auto-commits on success", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 10, name: "Frank", email: "frank@test.com", age: 40 }).exec();
        });
        const count = db.from(users).count();
        expect(count).toBe(6);
        db.close();
    });

    test("Transaction auto-rollbacks on throw", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 10, name: "Frank", email: "frank@test.com", age: 40 }).exec();
                throw new Error("rollback!");
            });
        } catch (e) {
            
        }
        const count = db.from(users).count();
        expect(count).toBe(5);
        db.close();
    });

    test("Data persists after commit", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 10, name: "Zara", email: "zara@test.com", age: 27 }).exec();
        });
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.name).toBe("Zara");
        db.close();
    });

    test("Data reverted after rollback", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 10, name: "Ghost", email: "ghost@test.com", age: 99 }).exec();
                throw new Error("rollback!");
            });
        } catch (e) {
            
        }
        const row = db.from(users).where({ id: 10 }).first();
        expect(row).toBe(null);
        db.close();
    });

    test("Transaction fn receives context with .from()", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            expect(typeof tx.from).toBe("function");
        });
        db.close();
    });

    test("Transaction fn receives context with .exec()", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            expect(typeof tx.exec).toBe("function");
        });
        db.close();
    });

    test("Transaction fn receives context with .query()", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            expect(typeof tx.query).toBe("function");
        });
        db.close();
    });

    test("Insert inside transaction visible after commit", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 20, name: "Visible", email: "v@test.com", age: 50 }).exec();
        });
        const exists = db.from(users).where({ id: 20 }).exists();
        expect(exists).toBe(true);
        db.close();
    });

    test("Insert inside transaction NOT visible after rollback", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 20, name: "Invisible", email: "i@test.com", age: 50 }).exec();
                throw new Error("abort");
            });
        } catch (e) {
            
        }
        const exists = db.from(users).where({ id: 20 }).exists();
        expect(exists).toBe(false);
        db.close();
    });

    test("Nested operations in one transaction", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 10, name: "Ten", email: "ten@test.com", age: 10 }).exec();
            tx.from(users).where({ id: 10 }).update({ name: "TenUpdated" }).exec();
        });
        const row = db.from(users).where({ id: 10 }).first();
        expect(row.name).toBe("TenUpdated");
        db.close();
    });

    test("Multiple inserts in one transaction", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 10, name: "X", email: "x@t.com", age: 10 }).exec();
            tx.from(users).insert({ id: 11, name: "Y", email: "y@t.com", age: 11 }).exec();
            tx.from(users).insert({ id: 12, name: "Z", email: "z@t.com", age: 12 }).exec();
        });
        const count = db.from(users).count();
        expect(count).toBe(8);
        db.close();
    });

    test("Update + verify in one transaction", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).where({ id: 1 }).update({ age: 99 }).exec();
            const result = tx.query("SELECT age FROM users WHERE id = 1");
            const ageIdx = result.columns.indexOf("age");
            expect(result.rows[0][ageIdx]).toBe(99);
        });
        db.close();
    });

    test("Transaction returns value from fn", () => {
        const { db, users } = setup();
        const result = db.transaction((tx) => {
            return tx.query("SELECT COUNT(*) as cnt FROM users");
        });
        const cntIdx = result.columns.indexOf("cnt");
        expect(result.rows[0][cntIdx]).toBe(5);
        db.close();
    });

    test("Throw inside transaction propagates error", () => {
        const { db, users } = setup();
        let caught = false;
        try {
            db.transaction((tx) => {
                throw new Error("user error");
            });
        } catch (e) {
            caught = true;
            expect(e.message).toBe("user error");
        }
        expect(caught).toBe(true);
        db.close();
    });
});
