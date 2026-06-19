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

describe("ekko:orm — Transaction Commit", () => {
    test("transaction() is a function", () => {
        const { db } = setup();
        expect(typeof db.transaction).toBe("function");
        db.close();
    });

    test("Transaction returns value from fn", () => {
        const { db, users } = setup();
        const result = db.transaction((tx) => {
            return 42;
        });
        expect(result).toBe(42);
        db.close();
    });

    test("Insert inside transaction persists after commit", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 10, name: "Frank", email: "frank@test.com", age: 40 }).exec();
        });
        const row = db.from(users).where({ id: 10 }).first();
        expect(row).not.toBe(null);
        expect(row.name).toBe("Frank");
        db.close();
    });

    test("Update inside transaction persists after commit", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).where({ id: 1 }).update({ name: "AliceUpdated" }).exec();
        });
        const row = db.from(users).where({ id: 1 }).first();
        expect(row.name).toBe("AliceUpdated");
        db.close();
    });

    test("Delete inside transaction persists after commit", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).where({ id: 5 }).delete().exec();
        });
        const exists = db.from(users).where({ id: 5 }).exists();
        expect(exists).toBe(false);
        db.close();
    });

    test("Multiple inserts in one transaction all persist", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 10, name: "X1", email: "x1@t.com", age: 10 }).exec();
            tx.from(users).insert({ id: 11, name: "X2", email: "x2@t.com", age: 11 }).exec();
            tx.from(users).insert({ id: 12, name: "X3", email: "x3@t.com", age: 12 }).exec();
        });
        expect(db.from(users).where({ id: 10 }).exists()).toBe(true);
        expect(db.from(users).where({ id: 11 }).exists()).toBe(true);
        expect(db.from(users).where({ id: 12 }).exists()).toBe(true);
        expect(db.from(users).count()).toBe(8);
        db.close();
    });

    test("Multiple updates in one transaction all persist", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).where({ id: 1 }).update({ age: 100 }).exec();
            tx.from(users).where({ id: 2 }).update({ age: 200 }).exec();
            tx.from(users).where({ id: 3 }).update({ age: 300 }).exec();
        });
        expect(db.from(users).where({ id: 1 }).first().age).toBe(100);
        expect(db.from(users).where({ id: 2 }).first().age).toBe(200);
        expect(db.from(users).where({ id: 3 }).first().age).toBe(300);
        db.close();
    });

    test("Insert + update in same transaction both persist", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 20, name: "New", email: "new@t.com", age: 1 }).exec();
            tx.from(users).where({ id: 20 }).update({ age: 99 }).exec();
        });
        const row = db.from(users).where({ id: 20 }).first();
        expect(row).not.toBe(null);
        expect(row.age).toBe(99);
        db.close();
    });

    test("Transaction fn receives object with .from()", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            expect(typeof tx.from).toBe("function");
        });
        db.close();
    });

    test("Transaction fn receives object with .exec()", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            expect(typeof tx.exec).toBe("function");
        });
        db.close();
    });

    test("Transaction fn receives object with .query()", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            expect(typeof tx.query).toBe("function");
        });
        db.close();
    });

    test("tx.from(table).insert().exec() works", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            const result = tx.from(users).insert({ id: 50, name: "TxInsert", email: "ti@t.com", age: 50 }).exec();
            expect(result.affectedRows).toBe(1);
        });
        expect(db.from(users).where({ id: 50 }).first().name).toBe("TxInsert");
        db.close();
    });

    test("tx.from(table).where().update().exec() works", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).where({ id: 2 }).update({ name: "BobTx" }).exec();
        });
        expect(db.from(users).where({ id: 2 }).first().name).toBe("BobTx");
        db.close();
    });

    test("tx.from(table).where().delete().exec() works", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).where({ id: 4 }).delete().exec();
        });
        expect(db.from(users).where({ id: 4 }).exists()).toBe(false);
        db.close();
    });

    test("Count changes visible after transaction", () => {
        const { db, users } = setup();
        const before = db.from(users).count();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 10, name: "CountTest", email: "ct@t.com", age: 10 }).exec();
            tx.from(users).insert({ id: 11, name: "CountTest2", email: "ct2@t.com", age: 11 }).exec();
        });
        const after = db.from(users).count();
        expect(after).toBe(before + 2);
        db.close();
    });

    test("Data readable after transaction", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 77, name: "Readable", email: "r@t.com", age: 77 }).exec();
        });
        const all = db.from(users).toArray();
        const found = all.filter((r) => r.id === 77);
        expect(found.length).toBe(1);
        expect(found[0].email).toBe("r@t.com");
        db.close();
    });

    test("Sequential transactions are independent", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 10, name: "First", email: "f@t.com", age: 10 }).exec();
        });
        db.transaction((tx) => {
            tx.from(users).insert({ id: 11, name: "Second", email: "s@t.com", age: 11 }).exec();
        });
        expect(db.from(users).where({ id: 10 }).first().name).toBe("First");
        expect(db.from(users).where({ id: 11 }).first().name).toBe("Second");
        expect(db.from(users).count()).toBe(7);
        db.close();
    });

    test("Transaction returns computed value", () => {
        const { db, users } = setup();
        const result = db.transaction((tx) => {
            const r = tx.query("SELECT COUNT(*) as cnt FROM users");
            const cntIdx = r.columns.indexOf("cnt");
            return r.rows[0][cntIdx] * 2;
        });
        expect(result).toBe(10);
        db.close();
    });

    test("Transaction with read-then-write pattern", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            const row = tx.query("SELECT age FROM users WHERE id = 1");
            const ageIdx = row.columns.indexOf("age");
            const currentAge = row.rows[0][ageIdx];
            tx.from(users).where({ id: 1 }).update({ age: currentAge + 5 }).exec();
        });
        expect(db.from(users).where({ id: 1 }).first().age).toBe(35);
        db.close();
    });

    test("10 inserts in one transaction all persist", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            for (let i = 100; i < 110; i++) {
                tx.from(users).insert({ id: i, name: "Row" + i, email: i + "@t.com", age: i }).exec();
            }
        });
        expect(db.from(users).count()).toBe(15);
        for (let i = 100; i < 110; i++) {
            expect(db.from(users).where({ id: i }).exists()).toBe(true);
        }
        db.close();
    });
});
