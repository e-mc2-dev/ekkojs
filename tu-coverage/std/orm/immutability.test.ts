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

describe("ekko:orm — Immutability", () => {
    test(".where() returns new query", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const filtered = base.where({ id: 1 });
        expect(base).not.toBe(filtered);
        db.close();
    });

    test(".orderBy() returns new query", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const ordered = base.orderBy("name");
        expect(base).not.toBe(ordered);
        db.close();
    });

    test(".take() returns new query", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const limited = base.take(2);
        expect(base).not.toBe(limited);
        db.close();
    });

    test(".select() returns new query", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const projected = base.select("name");
        expect(base).not.toBe(projected);
        db.close();
    });

    test("Original query unaffected after chain", () => {
        const { db, users } = setup();
        const base = db.from(users);
        base.where({ id: 1 }).orderBy("name").take(1);
        const plan = base.toPlan();
        expect(plan.where).toBe(null);
        expect(plan.orders.length).toBe(0);
        expect(plan.limit).toBe(null);
        db.close();
    });

    test("Two forks from same base are independent", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const fork1 = base.where({ name: "Alice" });
        const fork2 = base.where({ name: "Bob" });
        const r1 = fork1.toArray();
        const r2 = fork2.toArray();
        expect(r1[0].name).toBe("Alice");
        expect(r2[0].name).toBe("Bob");
        db.close();
    });

    test("Terminal doesn't modify query", () => {
        const { db, users } = setup();
        const q = db.from(users).where({ age: 30 });
        q.toArray();
        q.count();
        q.first();
        
        const plan = q.toPlan();
        expect(plan.where).not.toBe(null);
        expect(plan.where.op).toBe("EQ");
        expect(plan.where.field).toBe("age");
        expect(plan.type).toBe("select");
        db.close();
    });

    test("toPlan() doesn't modify query", () => {
        const { db, users } = setup();
        const q = db.from(users).orderBy("name").take(3);
        const plan1 = q.toPlan();
        const plan2 = q.toPlan();
        expect(plan1.limit).toBe(plan2.limit);
        expect(plan1.orders.length).toBe(plan2.orders.length);
        db.close();
    });

    test("Chain of 5 operations each independent", () => {
        const { db, users } = setup();
        const q0 = db.from(users);
        const q1 = q0.select("name", "age");
        const q2 = q1.where({ age: 30 });
        const q3 = q2.orderBy("name");
        const q4 = q3.take(1);

        expect(q0.toPlan().fields[0]).toBe("*");
        expect(q1.toPlan().where).toBe(null);
        expect(q2.toPlan().orders.length).toBe(0);
        expect(q3.toPlan().limit).toBe(null);
        expect(q4.toPlan().limit).toBe(1);
        db.close();
    });

    test("Reuse same query for multiple terminals", () => {
        const { db, users } = setup();
        const q = db.from(users).where(u => u.age.gt(24));
        const count = q.count();
        const arr = q.toArray();
        const exists = q.exists();
        expect(count).toBe(4); 
        expect(arr.length).toBe(4);
        expect(exists).toBe(true);
        db.close();
    });
});
