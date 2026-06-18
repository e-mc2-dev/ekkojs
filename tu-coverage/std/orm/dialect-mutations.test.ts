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

describe("ekko:orm — Dialect Mutation SQL Generation (INSERT/UPDATE/DELETE)", () => {
    test("INSERT INTO with single field", () => {
        const { db, users } = setup();
        const sql = db.from(users).insert({ name: "Test" }).toSQL();
        expect(sql.includes("INSERT INTO")).toBe(true);
        expect(sql.includes("users")).toBe(true);
        expect(sql.includes("name")).toBe(true);
        db.close();
    });

    test("INSERT INTO with multiple fields", () => {
        const { db, users } = setup();
        const sql = db.from(users).insert({ id: 10, name: "Test", email: "t@t.com", age: 50 }).toSQL();
        expect(sql.includes("INSERT INTO")).toBe(true);
        expect(sql.includes("id")).toBe(true);
        expect(sql.includes("name")).toBe(true);
        expect(sql.includes("email")).toBe(true);
        expect(sql.includes("age")).toBe(true);
        db.close();
    });

    test("INSERT INTO column list matches values count", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "Test", age: 50 }).toPlan();
        const result = db.dialect.compileInsert(plan);
        const colMatch = result.query.match(/\(([^)]+)\)\s*VALUES/);
        const valMatch = result.query.match(/VALUES\s*\(([^)]+)\)/);
        expect(colMatch).not.toBe(null);
        expect(valMatch).not.toBe(null);
        const colCount = colMatch[1].split(",").length;
        const valCount = valMatch[1].split(",").length;
        expect(colCount).toBe(valCount);
        db.close();
    });

    test("INSERT params use @name format", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "Test" }).toPlan();
        const result = db.dialect.compileInsert(plan);
        expect(result.query.includes("@")).toBe(true);
        db.close();
    });

    test("INSERT with string value", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "Hello" }).toPlan();
        const result = db.dialect.compileInsert(plan);
        const vals = Object.values(result.params);
        expect(vals.length > 0).toBe(true);
        let hasHello = false;
        for (const p of vals) {
            if (p === "Hello") hasHello = true;
        }
        expect(hasHello).toBe(true);
        db.close();
    });

    test("INSERT with number value", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 99, name: "X" }).toPlan();
        const result = db.dialect.compileInsert(plan);
        let has99 = false;
        for (const p of Object.values(result.params)) {
            if (p === 99) has99 = true;
        }
        expect(has99).toBe(true);
        db.close();
    });

    test("INSERT with null value", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "X", email: null }).toPlan();
        const result = db.dialect.compileInsert(plan);
        let hasNull = false;
        for (const p of Object.values(result.params)) {
            if (p === null) hasNull = true;
        }
        expect(hasNull).toBe(true);
        db.close();
    });

    test("INSERT with boolean-like value (0/1)", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "X", age: 0 }).toPlan();
        const result = db.dialect.compileInsert(plan);
        let hasZero = false;
        for (const p of Object.values(result.params)) {
            if (p === 0) hasZero = true;
        }
        expect(hasZero).toBe(true);
        db.close();
    });

    test("UPDATE SET with single field", () => {
        const { db, users } = setup();
        const sql = db.from(users).where({ id: 1 }).update({ name: "Updated" }).toSQL();
        expect(sql.includes("UPDATE")).toBe(true);
        expect(sql.includes("SET")).toBe(true);
        expect(sql.includes("name")).toBe(true);
        db.close();
    });

    test("UPDATE SET with multiple fields", () => {
        const { db, users } = setup();
        const sql = db.from(users).where({ id: 1 }).update({ name: "Updated", age: 99 }).toSQL();
        expect(sql.includes("UPDATE")).toBe(true);
        expect(sql.includes("SET")).toBe(true);
        expect(sql.includes("name")).toBe(true);
        expect(sql.includes("age")).toBe(true);
        db.close();
    });

    test("UPDATE SET + WHERE combined", () => {
        const { db, users } = setup();
        const sql = db.from(users).where({ id: 1 }).update({ name: "Updated" }).toSQL();
        expect(sql.includes("UPDATE")).toBe(true);
        expect(sql.includes("SET")).toBe(true);
        expect(sql.includes("WHERE")).toBe(true);
        db.close();
    });

    test("UPDATE params for SET values", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).update({ name: "NewName" }).toPlan();
        const result = db.dialect.compileUpdate(plan);
        let hasNewName = false;
        for (const p of Object.values(result.params)) {
            if (p === "NewName") hasNewName = true;
        }
        expect(hasNewName).toBe(true);
        db.close();
    });

    test("UPDATE params for WHERE values", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 42 }).update({ name: "X" }).toPlan();
        const result = db.dialect.compileUpdate(plan);
        let has42 = false;
        for (const p of Object.values(result.params)) {
            if (p === 42) has42 = true;
        }
        expect(has42).toBe(true);
        db.close();
    });

    test("DELETE FROM basic", () => {
        const { db, users } = setup();
        const sql = db.from(users).delete().toSQL();
        expect(sql.includes("DELETE")).toBe(true);
        expect(sql.includes("FROM")).toBe(true);
        expect(sql.includes("users")).toBe(true);
        db.close();
    });

    test("DELETE FROM with WHERE", () => {
        const { db, users } = setup();
        const sql = db.from(users).where({ id: 1 }).delete().toSQL();
        expect(sql.includes("DELETE")).toBe(true);
        expect(sql.includes("FROM")).toBe(true);
        expect(sql.includes("WHERE")).toBe(true);
        db.close();
    });

    test("DELETE params for WHERE", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 7 }).delete().toPlan();
        const result = db.dialect.compileDelete(plan);
        let has7 = false;
        for (const p of Object.values(result.params)) {
            if (p === 7) has7 = true;
        }
        expect(has7).toBe(true);
        db.close();
    });

    test("CREATE TABLE with single column", () => {
        const { db } = setup();
        const schema = defineTable("simple", { id: { type: "INT", primaryKey: true } });
        const result = db.dialect.compileCreateTable(schema);
        expect(result.includes("CREATE TABLE")).toBe(true);
        expect(result.includes("simple")).toBe(true);
        expect(result.includes("id")).toBe(true);
        db.close();
    });

    test("CREATE TABLE with multiple columns", () => {
        const { db } = setup();
        const schema = defineTable("multi", { id: { type: "INT", primaryKey: true }, name: { type: "TEXT" }, val: { type: "INT" } });
        const result = db.dialect.compileCreateTable(schema);
        expect(result.includes("id")).toBe(true);
        expect(result.includes("name")).toBe(true);
        expect(result.includes("val")).toBe(true);
        db.close();
    });

    test("CREATE TABLE with PRIMARY KEY", () => {
        const { db } = setup();
        const schema = defineTable("pk_test", { id: { type: "INT", primaryKey: true } });
        const result = db.dialect.compileCreateTable(schema);
        expect(result.includes("PRIMARY KEY")).toBe(true);
        db.close();
    });

    test("CREATE TABLE with NOT NULL", () => {
        const { db } = setup();

        const schema = defineTable("nn_test", { id: { type: "INT", primaryKey: true }, name: { type: "TEXT" } });
        const result = db.dialect.compileCreateTable(schema);
        expect(result.includes("NOT NULL")).toBe(true);
        db.close();
    });

    test("CREATE TABLE with UNIQUE", () => {
        const { db } = setup();
        const schema = defineTable("uq_test", { id: { type: "INT", primaryKey: true }, email: { type: "TEXT", unique: true } });
        const result = db.dialect.compileCreateTable(schema);
        expect(result.includes("UNIQUE")).toBe(true);
        db.close();
    });

    test("CREATE TABLE with DEFAULT string", () => {
        const { db } = setup();
        const schema = defineTable("def_test", { id: { type: "INT", primaryKey: true }, status: { type: "TEXT", default: "active" } });
        const result = db.dialect.compileCreateTable(schema);
        expect(result.includes("DEFAULT")).toBe(true);
        expect(result.includes("active")).toBe(true);
        db.close();
    });

    test("CREATE TABLE with DEFAULT number", () => {
        const { db } = setup();
        const schema = defineTable("def_num", { id: { type: "INT", primaryKey: true }, count: { type: "INT", default: 0 } });
        const result = db.dialect.compileCreateTable(schema);
        expect(result.includes("DEFAULT")).toBe(true);
        expect(result.includes("0")).toBe(true);
        db.close();
    });

    test("CREATE TABLE IF NOT EXISTS present", () => {
        const { db } = setup();
        const schema = defineTable("ifne_test", { id: { type: "INT", primaryKey: true } });
        const result = db.dialect.compileCreateTable(schema);
        expect(result.includes("IF NOT EXISTS")).toBe(true);
        db.close();
    });

    test("DROP TABLE IF EXISTS", () => {
        const { db } = setup();
        const schema = defineTable("drop_test", { id: { type: "INT", primaryKey: true } });
        
        const dropSql = db.dialect.compileDropTable(schema);
        expect(dropSql.includes("DROP TABLE IF EXISTS")).toBe(true);
        db.createTable(schema);
        db.dropTable(schema);
        
        db.createTable(schema);
        expect(true).toBe(true);
        db.close();
    });
});
