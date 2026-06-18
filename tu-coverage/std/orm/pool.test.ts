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
    return { db, users };
}

describe("ekko:orm — Pool", () => {
    test("db.createPool is a function", () => {
        const { db } = setup();
        expect(typeof db.createPool).toBe("function");
        db.close();
    });

    test("Pool has acquire method", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        expect(typeof pool.acquire).toBe("function");
        pool.close();
        db.close();
    });

    test("Pool has release method", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        expect(typeof pool.release).toBe("function");
        pool.close();
        db.close();
    });

    test("Pool has stats method", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        expect(typeof pool.stats).toBe("function");
        pool.close();
        db.close();
    });

    test("Pool has close method", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        expect(typeof pool.close).toBe("function");
        pool.close();
        db.close();
    });

    test("Pool has query method", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        expect(typeof pool.query).toBe("function");
        pool.close();
        db.close();
    });

    test("Pool has execute method", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        expect(typeof pool.execute).toBe("function");
        pool.close();
        db.close();
    });

    test("Pool has transaction method", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        expect(typeof pool.transaction).toBe("function");
        pool.close();
        db.close();
    });

    test("stats() returns {total, available, busy}", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 2, max: 5 });
        const s = pool.stats();
        expect(s.total).not.toBe(undefined);
        expect(s.available).not.toBe(undefined);
        expect(s.busy).not.toBe(undefined);
        pool.close();
        db.close();
    });

    test("Initial stats has available > 0", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 2, max: 5 });
        const s = pool.stats();
        expect(s.available > 0).toBe(true);
        pool.close();
        db.close();
    });

    test("acquire() returns a connection", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        const conn = pool.acquire();
        expect(conn).not.toBe(null);
        expect(conn).not.toBe(undefined);
        pool.release(conn);
        pool.close();
        db.close();
    });

    test("After acquire, busy increases", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 2, max: 5 });
        const before = pool.stats().busy;
        const conn = pool.acquire();
        const after = pool.stats().busy;
        expect(after).toBe(before + 1);
        pool.release(conn);
        pool.close();
        db.close();
    });

    test("After release, available increases", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 2, max: 5 });
        const conn = pool.acquire();
        const before = pool.stats().available;
        pool.release(conn);
        const after = pool.stats().available;
        expect(after).toBe(before + 1);
        pool.close();
        db.close();
    });

    test("pool.query works (acquire + query + release)", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        const result = pool.query("SELECT * FROM users");
        expect(result.rows.length).toBe(3);
        pool.close();
        db.close();
    });

    test("pool.transaction works (acquire + begin + commit + release)", () => {
        const { db, users } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        pool.transaction((tx) => {
            tx.execute("INSERT INTO users (id, name, email, age) VALUES (10, 'Pool', 'pool@test.com', 44)");
        });
        const result = pool.query("SELECT * FROM users WHERE id = 10");
        expect(result.rows.length).toBe(1);
        const nameIdx = result.columns.indexOf("name");
        expect(result.rows[0][nameIdx]).toBe("Pool");
        pool.close();
        db.close();
    });
});
