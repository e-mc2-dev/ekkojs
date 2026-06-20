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

describe("ekko:orm — Schema", () => {
    test("defineTable returns object", () => {
        const table = defineTable("users", { id: { type: "INT", primaryKey: true }, name: { type: "TEXT" } });
        expect(typeof table).toBe("object");
        expect(table).not.toBe(null);
    });

    test("defineTable._name is table name", () => {
        const table = defineTable("products", { id: { type: "INT", primaryKey: true } });
        expect(table._name).toBe("products");
    });

    test("defineTable._columns has keys", () => {
        const table = defineTable("items", { id: { type: "INT", primaryKey: true }, title: { type: "TEXT" }, price: { type: "REAL" } });
        expect(table._columns.id).not.toBe(undefined);
        expect(table._columns.title).not.toBe(undefined);
        expect(table._columns.price).not.toBe(undefined);
    });

    test("createTable creates table (can insert after)", () => {
        const db = connect(Database(":memory:"));
        const items = defineTable("items", { id: { type: "INT", primaryKey: true }, name: { type: "TEXT" } });
        db.createTable(items);
        db.from(items).insert({ id: 1, name: "Widget" }).exec();
        const row = db.from(items).where({ id: 1 }).first();
        expect(row.name).toBe("Widget");
        db.close();
    });

    test("dropTable removes table", () => {
        const db = connect(Database(":memory:"));
        const temp = defineTable("temp", { id: { type: "INT", primaryKey: true } });
        db.createTable(temp);
        db.dropTable("temp");
        let threw = false;
        try {
            db.from(temp).toArray();
        } catch (e) {
            threw = true;
        }
        expect(threw).toBe(true);
        db.close();
    });

    test("Column type preserved", () => {
        const table = defineTable("t", { id: { type: "INT", primaryKey: true }, data: { type: "BLOB" } });
        expect(table._columns.id.type).toBe("INT");
        expect(table._columns.data.type).toBe("BLOB");
    });

    test("primaryKey flag preserved", () => {
        const table = defineTable("t", { id: { type: "INT", primaryKey: true }, name: { type: "TEXT" } });
        expect(table._columns.id.primaryKey).toBe(true);
        expect(table._columns.name.primaryKey).toBe(undefined);
    });

    test("Multiple tables coexist", () => {
        const db = connect(Database(":memory:"));
        const t1 = defineTable("table1", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        const t2 = defineTable("table2", { id: { type: "INT", primaryKey: true }, val: { type: "TEXT" } });
        db.createTable(t1);
        db.createTable(t2);
        db.from(t1).insert({ id: 1, val: "A" }).exec();
        db.from(t2).insert({ id: 1, val: "B" }).exec();
        expect(db.from(t1).first().val).toBe("A");
        expect(db.from(t2).first().val).toBe("B");
        db.close();
    });

    test("createTable is idempotent", () => {
        const db = connect(Database(":memory:"));
        const t = defineTable("idem", { id: { type: "INT", primaryKey: true } });
        db.createTable(t);
        
        let threw = false;
        try {
            db.createTable(t);
        } catch (e) {
            threw = true;
        }
        expect(threw).toBe(false);
        db.close();
    });

    test("orm.col has int/text/real/bool/blob", () => {
        expect(orm.col).not.toBe(undefined);
        expect(orm.col.int).not.toBe(undefined);
        expect(orm.col.text).not.toBe(undefined);
        expect(orm.col.real).not.toBe(undefined);
        expect(orm.col.bool).not.toBe(undefined);
        expect(orm.col.blob).not.toBe(undefined);
    });
});
