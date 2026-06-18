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
    return { db, users };
}

describe("ekko:orm — QueryPlan", () => {
    test(".toPlan() returns object", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(typeof plan).toBe("object");
        expect(plan).not.toBe(null);
        db.close();
    });

    test("toPlan().type === 'select' by default", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.type).toBe("select");
        db.close();
    });

    test("toPlan().table is the table name", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.table).toBe("users");
        db.close();
    });

    test("toPlan().fields is ['*'] by default", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.fields.length).toBe(1);
        expect(plan.fields[0]).toBe("*");
        db.close();
    });

    test(".select('name').toPlan().fields === ['name']", () => {
        const { db, users } = setup();
        const plan = db.from(users).select("name").toPlan();
        expect(plan.fields.length).toBe(1);
        expect(plan.fields[0]).toBe("name");
        db.close();
    });

    test(".where({id:1}).toPlan().where is a single EQ node", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).toPlan();
        expect(plan.where).not.toBe(null);
        expect(plan.where.op).toBe("EQ");
        expect(plan.where.field).toBe("id");
        expect(plan.where.value).toBe(1);
        db.close();
    });

    test(".where(u=>u.age.gt(30)).toPlan().where.op === 'GT'", () => {
        const { db, users } = setup();
        const plan = db.from(users).where((u) => u.age.gt(30)).toPlan();
        expect(plan.where.op).toBe("GT");
        expect(plan.where.field).toBe("age");
        expect(plan.where.value).toBe(30);
        db.close();
    });

    test(".orderBy('name').toPlan().orders has 1 entry", () => {
        const { db, users } = setup();
        const plan = db.from(users).orderBy("name").toPlan();
        expect(plan.orders.length).toBe(1);
        db.close();
    });

    test(".take(10).toPlan().limit === 10", () => {
        const { db, users } = setup();
        const plan = db.from(users).take(10).toPlan();
        expect(plan.limit).toBe(10);
        db.close();
    });

    test(".skip(5).toPlan().offset === 5", () => {
        const { db, users } = setup();
        const plan = db.from(users).skip(5).toPlan();
        expect(plan.offset).toBe(5);
        db.close();
    });

    test(".distinct().toPlan().distinct === true", () => {
        const { db, users } = setup();
        const plan = db.from(users).distinct().toPlan();
        expect(plan.distinct).toBe(true);
        db.close();
    });

    test(".insert({name:'A'}).toPlan().type === 'insert'", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ name: "A" }).toPlan();
        expect(plan.type).toBe("insert");
        db.close();
    });

    test(".update({name:'B'}).toPlan().type === 'update'", () => {
        const { db, users } = setup();
        const plan = db.from(users).update({ name: "B" }).toPlan();
        expect(plan.type).toBe("update");
        db.close();
    });

    test(".delete().toPlan().type === 'delete'", () => {
        const { db, users } = setup();
        const plan = db.from(users).delete().toPlan();
        expect(plan.type).toBe("delete");
        db.close();
    });

    test(".join('orders','users.id=orders.uid').toPlan().joins has 1 entry", () => {
        const { db, users } = setup();
        const plan = db.from(users).join("orders", "users.id=orders.uid").toPlan();
        expect(plan.joins.length).toBe(1);
        db.close();
    });
});
