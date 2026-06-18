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

describe("ekko:orm — Pool Lifecycle", () => {
    test("createPool returns object", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        expect(typeof pool).toBe("object");
        expect(pool).not.toBe(null);
        pool.close();
        db.close();
    });

    test("Pool with min:1 starts with 1 available", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 5 });
        const s = pool.stats();
        expect(s.available).toBe(1);
        pool.close();
        db.close();
    });

    test("Pool with min:3 starts with 3 available", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 3, max: 5 });
        const s = pool.stats();
        expect(s.available).toBe(3);
        pool.close();
        db.close();
    });

    test("acquire() returns connection", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        const conn = pool.acquire();
        expect(conn).not.toBe(null);
        expect(conn).not.toBe(undefined);
        pool.release(conn);
        pool.close();
        db.close();
    });

    test("acquire() connection has execute method", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        const conn = pool.acquire();
        expect(typeof conn.execute).toBe("function");
        pool.release(conn);
        pool.close();
        db.close();
    });

    test("acquire() connection has query method", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        const conn = pool.acquire();
        expect(typeof conn.query).toBe("function");
        pool.release(conn);
        pool.close();
        db.close();
    });

    test("After acquire, stats.busy increases", () => {
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

    test("After acquire, stats.available decreases", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 2, max: 5 });
        const before = pool.stats().available;
        const conn = pool.acquire();
        const after = pool.stats().available;
        expect(after).toBe(before - 1);
        pool.release(conn);
        pool.close();
        db.close();
    });

    test("release() returns connection to pool", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 2, max: 5 });
        const conn = pool.acquire();
        const busyBefore = pool.stats().busy;
        pool.release(conn);
        const busyAfter = pool.stats().busy;
        expect(busyAfter).toBe(busyBefore - 1);
        pool.close();
        db.close();
    });

    test("After release, stats.available increases", () => {
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

    test("After release, stats.busy decreases", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 2, max: 5 });
        const conn = pool.acquire();
        const busyWhileAcquired = pool.stats().busy;
        pool.release(conn);
        const busyAfterRelease = pool.stats().busy;
        expect(busyAfterRelease).toBe(busyWhileAcquired - 1);
        pool.close();
        db.close();
    });

    test("Multiple acquire/release cycles", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        for (let i = 0; i < 5; i++) {
            const conn = pool.acquire();
            const s = pool.stats();
            expect(s.busy > 0).toBe(true);
            pool.release(conn);
        }
        const final = pool.stats();
        expect(final.busy).toBe(0);
        pool.close();
        db.close();
    });

    test("Pool.query() auto-acquires and releases", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        const result = pool.query("SELECT * FROM users");
        expect(result.rows.length).toBe(5);
        const s = pool.stats();
        expect(s.busy).toBe(0);
        pool.close();
        db.close();
    });

    test("Pool.execute() auto-acquires and releases", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        pool.execute("INSERT INTO users (id, name, email, age) VALUES (10, 'PoolExec', 'pe@t.com', 40)");
        const s = pool.stats();
        expect(s.busy).toBe(0);
        const result = pool.query("SELECT * FROM users WHERE id = 10");
        expect(result.rows.length).toBe(1);
        pool.close();
        db.close();
    });

    test("Pool.transaction() auto-acquires and releases", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        pool.transaction((tx) => {
            tx.execute("INSERT INTO users (id, name, email, age) VALUES (10, 'PoolTx', 'pt@t.com', 40)");
        });
        const s = pool.stats();
        expect(s.busy).toBe(0);
        pool.close();
        db.close();
    });

    test("Pool.transaction() commits on success", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        pool.transaction((tx) => {
            tx.execute("INSERT INTO users (id, name, email, age) VALUES (10, 'Committed', 'c@t.com', 40)");
        });
        const result = pool.query("SELECT * FROM users WHERE id = 10");
        expect(result.rows.length).toBe(1);
        const nameIdx = result.columns.indexOf("name");
        expect(result.rows[0][nameIdx]).toBe("Committed");
        pool.close();
        db.close();
    });

    test("Pool.transaction() rollbacks on failure", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 3 });
        try {
            pool.transaction((tx) => {
                tx.execute("INSERT INTO users (id, name, email, age) VALUES (10, 'RolledBack', 'rb@t.com', 40)");
                throw new Error("pool tx fail");
            });
        } catch (e) {
            
        }
        const result = pool.query("SELECT * FROM users WHERE id = 10");
        expect(result.rows.length).toBe(0);
        pool.close();
        db.close();
    });

    test("Pool with max:2 — third acquire throws", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 1, max: 2 });
        const conn1 = pool.acquire();
        const conn2 = pool.acquire();
        let threw = false;
        try {
            const conn3 = pool.acquire();
        } catch (e) {
            threw = true;
        }
        expect(threw).toBe(true);
        pool.release(conn1);
        pool.release(conn2);
        pool.close();
        db.close();
    });

    test("stats.total = available + busy", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 2, max: 5 });
        const s1 = pool.stats();
        expect(s1.total).toBe(s1.available + s1.busy);
        const conn = pool.acquire();
        const s2 = pool.stats();
        expect(s2.total).toBe(s2.available + s2.busy);
        pool.release(conn);
        pool.close();
        db.close();
    });

    test("Pool.close() closes all connections", () => {
        const { db } = setup();
        const pool = db.createPool({ min: 2, max: 5 });
        const statsBefore = pool.stats();
        expect(statsBefore.total).toBe(2);
        pool.close();
        const statsAfter = pool.stats();
        expect(statsAfter.available).toBe(0);
        expect(statsAfter.busy).toBe(0);
        db.close();
    });
});
