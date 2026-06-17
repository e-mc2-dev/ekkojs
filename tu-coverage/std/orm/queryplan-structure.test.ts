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

describe("ekko:orm — QueryPlan AST Structure", () => {
    test("Default plan has type 'select'", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.type).toBe("select");
        db.close();
    });

    test("Default plan has table name", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.table).toBe("users");
        db.close();
    });

    test("Default plan has fields ['*']", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.fields.length).toBe(1);
        expect(plan.fields[0]).toBe("*");
        db.close();
    });

    test("Default plan has null where", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.where).toBe(null);
        db.close();
    });

    test("Default plan has empty orders array", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(Array.isArray(plan.orders)).toBe(true);
        expect(plan.orders.length).toBe(0);
        db.close();
    });

    test("Default plan has null limit", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.limit).toBe(null);
        db.close();
    });

    test("Default plan has null offset", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.offset).toBe(null);
        db.close();
    });

    test("Default plan has empty joins array", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(Array.isArray(plan.joins)).toBe(true);
        expect(plan.joins.length).toBe(0);
        db.close();
    });

    test("Default plan has empty groups array", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(Array.isArray(plan.groups)).toBe(true);
        expect(plan.groups.length).toBe(0);
        db.close();
    });

    test("Default plan has null having", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.having).toBe(null);
        db.close();
    });

    test("Default plan has null data (no insert payload)", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.data).toBe(null);
        db.close();
    });

    test("Default plan has null data (no update payload)", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.data).toBe(null);
        db.close();
    });

    test("Default plan distinct is false", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        expect(plan.distinct).toBe(false);
        db.close();
    });

    test(".where({id:1}) builds WhereNode with op 'EQ'", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).toPlan();
        expect(plan.where).not.toBe(null);
        expect(plan.where.op).toBe("EQ");
        expect(plan.where.field).toBe("id");
        expect(plan.where.value).toBe(1);
        db.close();
    });

    test(".where(u=>u.age.gt) builds WhereNode with op 'GT'", () => {
        const { db, users } = setup();
        const plan = db.from(users).where((u) => u.age.gt(25)).toPlan();
        expect(plan.where.op).toBe("GT");
        expect(plan.where.field).toBe("age");
        expect(plan.where.value).toBe(25);
        db.close();
    });

    test(".where(u=>u.age.lt) builds WhereNode with op 'LT'", () => {
        const { db, users } = setup();
        const plan = db.from(users).where((u) => u.age.lt(30)).toPlan();
        expect(plan.where.op).toBe("LT");
        expect(plan.where.field).toBe("age");
        expect(plan.where.value).toBe(30);
        db.close();
    });

    test(".where(u=>u.age.gte) builds WhereNode with op 'GTE'", () => {
        const { db, users } = setup();
        const plan = db.from(users).where((u) => u.age.gte(25)).toPlan();
        expect(plan.where.op).toBe("GTE");
        expect(plan.where.field).toBe("age");
        expect(plan.where.value).toBe(25);
        db.close();
    });

    test(".where(u=>u.age.lte) builds WhereNode with op 'LTE'", () => {
        const { db, users } = setup();
        const plan = db.from(users).where((u) => u.age.lte(30)).toPlan();
        expect(plan.where.op).toBe("LTE");
        expect(plan.where.field).toBe("age");
        expect(plan.where.value).toBe(30);
        db.close();
    });

    test(".where(u=>u.name.like) builds WhereNode with op 'LIKE'", () => {
        const { db, users } = setup();
        const plan = db.from(users).where((u) => u.name.like("%li%")).toPlan();
        expect(plan.where.op).toBe("LIKE");
        expect(plan.where.field).toBe("name");
        expect(plan.where.value).toBe("%li%");
        db.close();
    });

    test(".where(u=>u.name.isIn) builds WhereNode with op 'IN' and array value", () => {
        const { db, users } = setup();
        const plan = db.from(users).where((u) => u.name.isIn(["Alice", "Bob"])).toPlan();
        expect(plan.where.op).toBe("IN");
        expect(plan.where.field).toBe("name");
        expect(Array.isArray(plan.where.value)).toBe(true);
        expect(plan.where.value.length).toBe(2);
        db.close();
    });

    test(".where(u=>u.email.isNull) builds WhereNode with op 'IS_NULL'", () => {
        const { db, users } = setup();
        const plan = db.from(users).where((u) => u.email.isNull()).toPlan();
        expect(plan.where.op).toBe("IS_NULL");
        expect(plan.where.field).toBe("email");
        db.close();
    });

    test(".where(u=>u.email.isNotNull) builds WhereNode with op 'IS_NOT_NULL'", () => {
        const { db, users } = setup();
        const plan = db.from(users).where((u) => u.email.isNotNull()).toPlan();
        expect(plan.where.op).toBe("IS_NOT_NULL");
        expect(plan.where.field).toBe("email");
        db.close();
    });

    test(".orderBy adds OrderNode with field and dir 'ASC'", () => {
        const { db, users } = setup();
        const plan = db.from(users).orderBy("name").toPlan();
        expect(plan.orders.length).toBe(1);
        expect(plan.orders[0].field).toBe("name");
        expect(plan.orders[0].dir).toBe("ASC");
        db.close();
    });

    test(".orderByDesc adds OrderNode with dir 'DESC'", () => {
        const { db, users } = setup();
        const plan = db.from(users).orderByDesc("age").toPlan();
        expect(plan.orders.length).toBe(1);
        expect(plan.orders[0].field).toBe("age");
        expect(plan.orders[0].dir).toBe("DESC");
        db.close();
    });

    test(".join adds JoinNode with type 'JOIN'", () => {
        const { db, users } = setup();
        const plan = db.from(users).join("orders", "users.id = orders.user_id").toPlan();
        expect(plan.joins.length).toBe(1);
        expect(plan.joins[0].type).toBe("JOIN");
        expect(plan.joins[0].table).toBe("orders");
        expect(plan.joins[0].on.__rawOn).toBe("users.id = orders.user_id");
        db.close();
    });

    test(".leftJoin adds JoinNode with type 'LEFT JOIN'", () => {
        const { db, users } = setup();
        const plan = db.from(users).leftJoin("orders", "users.id = orders.user_id").toPlan();
        expect(plan.joins.length).toBe(1);
        expect(plan.joins[0].type).toBe("LEFT JOIN");
        expect(plan.joins[0].table).toBe("orders");
        expect(plan.joins[0].on.__rawOn).toBe("users.id = orders.user_id");
        db.close();
    });

    test(".insert() changes type to 'insert' and sets data", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "X" }).toPlan();
        expect(plan.type).toBe("insert");
        expect(plan.data).not.toBe(null);
        db.close();
    });

    test(".update() changes type to 'update' and sets data", () => {
        const { db, users } = setup();
        const plan = db.from(users).update({ name: "Y" }).toPlan();
        expect(plan.type).toBe("update");
        expect(plan.data).not.toBe(null);
        db.close();
    });

    test(".delete() changes type to 'delete'", () => {
        const { db, users } = setup();
        const plan = db.from(users).delete().toPlan();
        expect(plan.type).toBe("delete");
        db.close();
    });

    test("Multiple wheres accumulate as a left-nested AND tree", () => {
        const { db, users } = setup();
        const plan = db.from(users)
            .where({ id: 1 })
            .where((u) => u.age.gt(20))
            .where((u) => u.age.lt(50))
            .toPlan();

        expect(plan.where.op).toBe("AND");
        expect(plan.where.right.op).toBe("LT");
        expect(plan.where.left.op).toBe("AND");
        expect(plan.where.left.left.op).toBe("EQ");
        expect(plan.where.left.right.op).toBe("GT");
        db.close();
    });
});
