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

describe("ekko:orm — QueryPlan Combinations & Interactions", () => {
    test("where + where = AND of 2 conditions", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).where({ name: "Alice" }).toPlan();
        
        expect(plan.where.op).toBe("AND");
        expect(plan.where.left.field).toBe("id");
        expect(plan.where.right.field).toBe("name");
        db.close();
    });

    test("where + where(gt) = mixed operators under AND", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ name: "Alice" }).where((u) => u.age.gt(20)).toPlan();
        
        expect(plan.where.op).toBe("AND");
        expect(plan.where.left.op).toBe("EQ");
        expect(plan.where.right.op).toBe("GT");
        db.close();
    });

    test("where + where(like) + where(isIn) = 3 different ops under AND", () => {
        const { db, users } = setup();
        const plan = db.from(users)
            .where({ id: 1 })
            .where((u) => u.name.like("%li%"))
            .where((u) => u.age.isIn([20, 30, 40]))
            .toPlan();
        
        expect(plan.where.op).toBe("AND");
        expect(plan.where.right.op).toBe("IN");
        expect(plan.where.left.op).toBe("AND");
        expect(plan.where.left.left.op).toBe("EQ");
        expect(plan.where.left.right.op).toBe("LIKE");
        db.close();
    });

    test("orderBy + orderByDesc = 2 orders", () => {
        const { db, users } = setup();
        const plan = db.from(users).orderBy("name").orderByDesc("age").toPlan();
        expect(plan.orders.length).toBe(2);
        expect(plan.orders[0].field).toBe("name");
        expect(plan.orders[0].dir).toBe("ASC");
        expect(plan.orders[1].field).toBe("age");
        expect(plan.orders[1].dir).toBe("DESC");
        db.close();
    });

    test("take + skip = both set", () => {
        const { db, users } = setup();
        const plan = db.from(users).take(10).skip(5).toPlan();
        expect(plan.limit).toBe(10);
        expect(plan.offset).toBe(5);
        db.close();
    });

    test("where + orderBy + take = all combined", () => {
        const { db, users } = setup();
        const plan = db.from(users).where((u) => u.age.gt(20)).orderBy("name").take(3).toPlan();
        expect(plan.where).not.toBe(null);
        expect(plan.where.op).toBe("GT");
        expect(plan.orders.length).toBe(1);
        expect(plan.limit).toBe(3);
        db.close();
    });

    test("distinct + select specific fields", () => {
        const { db, users } = setup();
        const plan = db.from(users).distinct().select("name", "age").toPlan();
        expect(plan.distinct).toBe(true);
        expect(plan.fields.length).toBe(2);
        expect(plan.fields[0]).toBe("name");
        expect(plan.fields[1]).toBe("age");
        db.close();
    });

    test("where + join = where applies to joined result", () => {
        const { db, users } = setup();
        const plan = db.from(users)
            .join("orders", "users.id = orders.user_id")
            .where({ id: 1 })
            .toPlan();
        expect(plan.joins.length).toBe(1);
        expect(plan.where).not.toBe(null);
        expect(plan.where.field).toBe("id");
        db.close();
    });

    test("groupBy + having = both set", () => {
        const { db, users } = setup();
        const plan = db.from(users).groupBy("age").having((u) => u.id.gt(1)).toPlan();
        expect(plan.groups.length > 0).toBe(true);
        expect(plan.having).not.toBe(null);
        expect(plan.having.op).toBe("GT");
        expect(plan.having.field).toBe("id");
        db.close();
    });

    test("join + where + orderBy + take = complex query plan", () => {
        const { db, users } = setup();
        const plan = db.from(users)
            .join("orders", "users.id = orders.user_id")
            .where((u) => u.age.gt(20))
            .orderBy("name")
            .take(5)
            .skip(1)
            .toPlan();
        expect(plan.joins.length).toBe(1);
        expect(plan.where).not.toBe(null);
        expect(plan.where.op).toBe("GT");
        expect(plan.orders.length).toBe(1);
        expect(plan.limit).toBe(5);
        expect(plan.offset).toBe(1);
        db.close();
    });

    test("insert overrides select type", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "X" }).toPlan();
        expect(plan.type).toBe("insert");
        db.close();
    });

    test("update overrides select type", () => {
        const { db, users } = setup();
        const plan = db.from(users).update({ name: "X" }).toPlan();
        expect(plan.type).toBe("update");
        db.close();
    });

    test("delete overrides select type", () => {
        const { db, users } = setup();
        const plan = db.from(users).delete().toPlan();
        expect(plan.type).toBe("delete");
        db.close();
    });

    test("insert preserves table", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "X" }).toPlan();
        expect(plan.table).toBe("users");
        db.close();
    });

    test("update preserves where (for WHERE clause)", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).update({ name: "Y" }).toPlan();
        expect(plan.type).toBe("update");
        expect(plan.where).not.toBe(null);
        expect(plan.where.field).toBe("id");
        expect(plan.where.value).toBe(1);
        db.close();
    });

    test("select fields reset by new select()", () => {
        const { db, users } = setup();
        const plan = db.from(users).select("name").select("age").toPlan();
        
        expect(plan.fields.length).toBe(1);
        expect(plan.fields[0]).toBe("age");
        db.close();
    });

    test("Multiple orderBy calls accumulate", () => {
        const { db, users } = setup();
        const plan = db.from(users).orderBy("name").orderBy("age").orderByDesc("id").toPlan();
        expect(plan.orders.length).toBe(3);
        expect(plan.orders[0].field).toBe("name");
        expect(plan.orders[1].field).toBe("age");
        expect(plan.orders[2].field).toBe("id");
        db.close();
    });

    test("Multiple where calls accumulate (left-nested AND tree)", () => {
        const { db, users } = setup();
        const plan = db.from(users)
            .where({ id: 1 })
            .where((u) => u.age.gt(10))
            .where((u) => u.age.lt(50))
            .where((u) => u.name.like("%A%"))
            .toPlan();
        
        expect(plan.where.op).toBe("AND");
        expect(plan.where.right.op).toBe("LIKE");
        expect(plan.where.left.op).toBe("AND");
        expect(plan.where.left.right.op).toBe("LT");
        expect(plan.where.left.left.op).toBe("AND");
        expect(plan.where.left.left.left.op).toBe("EQ");
        expect(plan.where.left.left.right.op).toBe("GT");
        db.close();
    });

    test("take overwrites previous take", () => {
        const { db, users } = setup();
        const plan = db.from(users).take(10).take(5).toPlan();
        expect(plan.limit).toBe(5);
        db.close();
    });

    test("skip overwrites previous skip", () => {
        const { db, users } = setup();
        const plan = db.from(users).skip(10).skip(3).toPlan();
        expect(plan.offset).toBe(3);
        db.close();
    });

    test("Plan serialization (toPlan) is JSON-serializable", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).orderBy("name").take(5).toPlan();
        let serialized = false;
        try {
            const json = JSON.stringify(plan);
            const parsed = JSON.parse(json);
            serialized = parsed.type === "select";
        } catch (e) {
            serialized = false;
        }
        expect(serialized).toBe(true);
        db.close();
    });

    test("Plan contains no functions (pure data)", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).toPlan();
        const json = JSON.stringify(plan);
        const parsed = JSON.parse(json);
        const keys = Object.keys(parsed);
        let hasFn = false;
        for (const k of keys) {
            if (typeof parsed[k] === "function") hasFn = true;
        }
        expect(hasFn).toBe(false);
        db.close();
    });

    test("Plan where nodes have correct value types (string, number)", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ name: "Alice" }).where((u) => u.age.gt(25)).toPlan();
        
        expect(typeof plan.where.left.value).toBe("string");
        expect(typeof plan.where.right.value).toBe("number");
        db.close();
    });

    test("WhereNode IN has array value", () => {
        const { db, users } = setup();
        const plan = db.from(users).where((u) => u.id.isIn([1, 2, 3])).toPlan();
        expect(Array.isArray(plan.where.value)).toBe(true);
        expect(plan.where.value[0]).toBe(1);
        expect(plan.where.value[1]).toBe(2);
        expect(plan.where.value[2]).toBe(3);
        db.close();
    });

    test("JoinNode has table and raw on strings", () => {
        const { db, users } = setup();
        const plan = db.from(users).join("orders", "users.id = orders.user_id").toPlan();
        expect(typeof plan.joins[0].table).toBe("string");
        expect(typeof plan.joins[0].on.__rawOn).toBe("string");
        expect(plan.joins[0].table).toBe("orders");
        expect(plan.joins[0].on.__rawOn).toBe("users.id = orders.user_id");
        db.close();
    });

    test("OrderNode field matches input", () => {
        const { db, users } = setup();
        const plan = db.from(users).orderBy("email").toPlan();
        expect(plan.orders[0].field).toBe("email");
        db.close();
    });

    test("GroupBy stores field names as array", () => {
        const { db, users } = setup();
        const plan = db.from(users).groupBy("age").toPlan();
        expect(Array.isArray(plan.groups)).toBe(true);
        expect(plan.groups.length > 0).toBe(true);
        db.close();
    });

    test("Having stores an AST expression node", () => {
        const { db, users } = setup();
        const plan = db.from(users).groupBy("age").having((u) => u.id.gt(2)).toPlan();
        expect(typeof plan.having).toBe("object");
        expect(plan.having.op).toBe("GT");
        expect(plan.having.field).toBe("id");
        expect(plan.having.value).toBe(2);
        db.close();
    });

    test("data contains the inserted object", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "Test", age: 99 }).toPlan();
        expect(plan.data).not.toBe(null);
        expect(typeof plan.data).toBe("object");
        db.close();
    });

    test("data is the update object", () => {
        const { db, users } = setup();
        const plan = db.from(users).update({ name: "Updated", age: 50 }).toPlan();
        expect(plan.data).not.toBe(null);
        expect(typeof plan.data).toBe("object");
        db.close();
    });
});
