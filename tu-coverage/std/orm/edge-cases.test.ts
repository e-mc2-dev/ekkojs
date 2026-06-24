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

describe("ekko:orm — Edge Cases & Stress", () => {
    test("Empty table queries return []", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        db.createTable(empty);
        expect(db.from(empty).toArray().length).toBe(0);
        db.close();
    });

    test("count on empty = 0", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true } });
        db.createTable(empty);
        expect(db.from(empty).count()).toBe(0);
        db.close();
    });

    test("first on empty = null", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true } });
        db.createTable(empty);
        expect(db.from(empty).first()).toBe(null);
        db.close();
    });

    test("exists on empty = false", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true } });
        db.createTable(empty);
        expect(db.from(empty).exists()).toBe(false);
        db.close();
    });

    test("sum on empty = 0 or null", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true }, val: { type: "INT" } });
        db.createTable(empty);
        const sum = db.from(empty).sum("val");
        expect(sum === 0 || sum === null).toBe(true);
        db.close();
    });

    test("avg on empty = 0 or null", () => {
        const db = connect(Database(":memory:"));
        const empty = defineTable("empty", { id: { type: "INT", primaryKey: true }, val: { type: "INT" } });
        db.createTable(empty);
        const avg = db.from(empty).avg("val");
        
        expect(avg === 0 || avg === null).toBe(true);
        db.close();
    });

    test("Insert into empty then query", () => {
        const db = connect(Database(":memory:"));
        const t = defineTable("t", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        db.createTable(t);
        expect(db.from(t).count()).toBe(0);
        db.from(t).insert({ id: 1, val: "first" }).exec();
        expect(db.from(t).count()).toBe(1);
        expect(db.from(t).first().val).toBe("first");
        db.close();
    });

    test("Table with single column", () => {
        const db = connect(Database(":memory:"));
        const ids = defineTable("ids", { id: { type: "INT", primaryKey: true } });
        db.createTable(ids);
        db.from(ids).insert({ id: 1 }).exec();
        db.from(ids).insert({ id: 2 }).exec();
        db.from(ids).insert({ id: 3 }).exec();
        expect(db.from(ids).count()).toBe(3);
        expect(db.from(ids).where({ id: 2 }).first().id).toBe(2);
        db.close();
    });

    test("Table with 10 columns", () => {
        const db = connect(Database(":memory:"));
        const wide = defineTable("wide", {
            id: { type: "INT", primaryKey: true },
            c1: { type: "TEXT" },
            c2: { type: "TEXT" },
            c3: { type: "TEXT" },
            c4: { type: "TEXT" },
            c5: { type: "TEXT" },
            c6: { type: "INT" },
            c7: { type: "INT" },
            c8: { type: "INT" },
            c9: { type: "REAL" }
        });
        db.createTable(wide);
        db.from(wide).insert({ id: 1, c1: "a", c2: "b", c3: "c", c4: "d", c5: "e", c6: 1, c7: 2, c8: 3, c9: 1.5 }).exec();
        const row = db.from(wide).where({ id: 1 }).first();
        expect(row.c1).toBe("a");
        expect(row.c5).toBe("e");
        expect(row.c9).toBe(1.5);
        db.close();
    });

    test("Query with all operators chained (where + gt + lt + like + order + limit)", () => {
        const { db, users } = setup();
        
        db.from(users).insert({ id: 6, name: "Alicia", email: "alicia@test.com", age: 26 }).exec();
        db.from(users).insert({ id: 7, name: "Albert", email: "albert@test.com", age: 31 }).exec();
        
        const result = db.from(users).where(u => u.name.like("Al%")).where(u => u.age.gt(20)).where(u => u.age.lt(32)).orderBy("age").take(2).toArray();
        expect(result.length).toBe(2);
        
        expect(result[0].name).toBe("Alicia");
        expect(result[1].name).toBe("Alice");
        db.close();
    });

    test("100 row insert + count = 100", () => {
        const db = connect(Database(":memory:"));
        const bulk = defineTable("bulk", { id: { type: "INT", primaryKey: true }, val: { type: "INT" } });
        db.createTable(bulk);
        for (let i = 1; i <= 100; i++) {
            db.from(bulk).insert({ id: i, val: i * 10 }).exec();
        }
        expect(db.from(bulk).count()).toBe(100);
        db.close();
    });

    test("100 row insert + whereGt = correct subset", () => {
        const db = connect(Database(":memory:"));
        const bulk = defineTable("bulk", { id: { type: "INT", primaryKey: true }, val: { type: "INT" } });
        db.createTable(bulk);
        for (let i = 1; i <= 100; i++) {
            db.from(bulk).insert({ id: i, val: i }).exec();
        }
        const result = db.from(bulk).where(b => b.val.gt(90)).toArray();
        expect(result.length).toBe(10); 
        db.close();
    });

    test("orderBy on text field (alphabetical)", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("name").toArray();
        expect(result[0].name).toBe("Alice");
        expect(result[1].name).toBe("Bob");
        expect(result[2].name).toBe("Charlie");
        expect(result[3].name).toBe("Diana");
        expect(result[4].name).toBe("Eve");
        db.close();
    });

    test("orderBy on number field (numeric)", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("age").toArray();
        expect(result[0].age).toBe(22); 
        expect(result[1].age).toBe(25); 
        expect(result[2].age).toBe(28); 
        expect(result[3].age).toBe(30); 
        expect(result[4].age).toBe(35); 
        db.close();
    });

    test("Multiple tables in same connection", () => {
        const db = connect(Database(":memory:"));
        const t1 = defineTable("products", { id: { type: "INT", primaryKey: true }, name: { type: "TEXT" } });
        const t2 = defineTable("orders", { id: { type: "INT", primaryKey: true }, total: { type: "INT" } });
        db.createTable(t1);
        db.createTable(t2);
        db.from(t1).insert({ id: 1, name: "Widget" }).exec();
        db.from(t2).insert({ id: 1, total: 500 }).exec();
        expect(db.from(t1).count()).toBe(1);
        expect(db.from(t2).count()).toBe(1);
        expect(db.from(t1).first().name).toBe("Widget");
        expect(db.from(t2).first().total).toBe(500);
        db.close();
    });

    test("Query one table doesn't affect another", () => {
        const db = connect(Database(":memory:"));
        const t1 = defineTable("t1", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        const t2 = defineTable("t2", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        db.createTable(t1);
        db.createTable(t2);
        db.from(t1).insert({ id: 1, val: "A" }).exec();
        db.from(t1).insert({ id: 2, val: "B" }).exec();
        db.from(t2).insert({ id: 1, val: "X" }).exec();
        db.from(t1).where({ id: 1 }).delete().exec();
        expect(db.from(t1).count()).toBe(1);
        expect(db.from(t2).count()).toBe(1);
        expect(db.from(t2).first().val).toBe("X");
        db.close();
    });

    test("defineTable with every column type", () => {
        const table = defineTable("alltypes", {
            id: { type: "INT", primaryKey: true },
            name: { type: "TEXT" },
            score: { type: "REAL" },
            active: { type: "BOOL" },
            data: { type: "BLOB" }
        });
        expect(table._columns.id.type).toBe("INT");
        expect(table._columns.name.type).toBe("TEXT");
        expect(table._columns.score.type).toBe("REAL");
        expect(table._columns.active.type).toBe("BOOL");
        expect(table._columns.data.type).toBe("BLOB");
    });

    test("Schema column count matches definition", () => {
        const table = defineTable("five", {
            a: { type: "INT", primaryKey: true },
            b: { type: "TEXT" },
            c: { type: "TEXT" },
            d: { type: "INT" },
            e: { type: "REAL" }
        });
        const keys = Object.keys(table._columns);
        expect(keys.length).toBe(5);
    });

    test("Long string value (1000 chars) roundtrip", () => {
        const db = connect(Database(":memory:"));
        const t = defineTable("longstr", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        db.createTable(t);
        let long = "";
        for (let i = 0; i < 100; i++) {
            long += "abcdefghij"; 
        }
        db.from(t).insert({ id: 1, val: long }).exec();
        const row = db.from(t).where({ id: 1 }).first();
        expect(row.val.length).toBe(1000);
        expect(row.val).toBe(long);
        db.close();
    });

    test("Zero ID works", () => {
        const db = connect(Database(":memory:"));
        const t = defineTable("zid", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        db.createTable(t);
        db.from(t).insert({ id: 0, val: "zero" }).exec();
        const row = db.from(t).where({ id: 0 }).first();
        expect(row).not.toBe(null);
        expect(row.val).toBe("zero");
        db.close();
    });

    test("Negative ID works", () => {
        const db = connect(Database(":memory:"));
        const t = defineTable("negid", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        db.createTable(t);
        db.from(t).insert({ id: -1, val: "negative" }).exec();
        const row = db.from(t).where({ id: -1 }).first();
        expect(row).not.toBe(null);
        expect(row.val).toBe("negative");
        db.close();
    });

    test("Float/REAL value roundtrip", () => {
        const db = connect(Database(":memory:"));
        const t = defineTable("floats", { id: { type: "INT", primaryKey: true }, val: { type: "REAL" } });
        db.createTable(t);
        db.from(t).insert({ id: 1, val: 3.14159 }).exec();
        db.from(t).insert({ id: 2, val: -0.001 }).exec();
        db.from(t).insert({ id: 3, val: 999999.999 }).exec();
        expect(db.from(t).where({ id: 1 }).first().val).toBe(3.14159);
        expect(db.from(t).where({ id: 2 }).first().val).toBe(-0.001);
        expect(db.from(t).where({ id: 3 }).first().val).toBe(999999.999);
        db.close();
    });

    test("Multiple connections to different databases are isolated", () => {
        const db1 = connect(Database(":memory:"));
        const db2 = connect(Database(":memory:"));
        const t1 = defineTable("shared", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        const t2 = defineTable("shared", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        db1.createTable(t1);
        db2.createTable(t2);
        db1.from(t1).insert({ id: 1, val: "db1" }).exec();
        db2.from(t2).insert({ id: 1, val: "db2" }).exec();
        db2.from(t2).insert({ id: 2, val: "db2b" }).exec();
        expect(db1.from(t1).count()).toBe(1);
        expect(db2.from(t2).count()).toBe(2);
        expect(db1.from(t1).first().val).toBe("db1");
        expect(db2.from(t2).first().val).toBe("db2");
        db1.close();
        db2.close();
    });

    test("Same query builder reused 10 times", () => {
        const { db, users } = setup();
        const q = db.from(users).where({ id: 1 });
        for (let i = 0; i < 10; i++) {
            const row = q.first();
            expect(row.name).toBe("Alice");
        }
        db.close();
    });

    test("Chain of 10 operations produces correct plan", () => {
        const { db, users } = setup();
        const q = db.from(users)
            .select("name", "age")
            .where(u => u.age.gt(20))
            .where(u => u.age.lt(40))
            .where(u => u.name.isNotNull())
            .orderBy("age")
            .take(10);
        const plan = q.toPlan();
        expect(plan.fields.length).toBe(2);
        
        const countLeaves = (n) => {
            if (!n) return 0;
            if (n.op === "AND" || n.op === "OR") return countLeaves(n.left) + countLeaves(n.right);
            if (n.op === "NOT") return countLeaves(n.child);
            return 1;
        };
        expect(countLeaves(plan.where) >= 3).toBe(true);
        expect(plan.orders.length > 0).toBe(true);
        expect(plan.limit).toBe(10);
        
        const result = q.toArray();
        expect(result.length).toBe(5);
        db.close();
    });
});
