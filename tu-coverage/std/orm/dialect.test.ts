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

describe("ekko:orm — Dialect", () => {
    test("db.dialect exists and is an object", () => {
        const { db } = setup();
        expect(db.dialect).not.toBe(null);
        expect(typeof db.dialect).toBe("object");
        db.close();
    });

    test("db.dialect.name === 'sqlite'", () => {
        const { db } = setup();
        expect(db.dialect.name).toBe("sqlite");
        db.close();
    });

    test("db.dialect is a SQL dialect", () => {
        const { db } = setup();
        expect(db.dialect.isSql).toBe(true);
        db.close();
    });

    test("db.dialect.param(value) returns '@p0' after resetParams", () => {
        const { db } = setup();
        db.dialect.resetParams();
        expect(db.dialect.param(0)).toBe("@p0");
        
        expect(db.dialect._params.p0).toBe(0);
        db.close();
    });

    test("db.dialect.param() allocates sequential placeholders and records values", () => {
        const { db } = setup();
        db.dialect.resetParams();
        expect(db.dialect.param("alpha")).toBe("@p0");
        expect(db.dialect.param("beta")).toBe("@p1");
        expect(db.dialect._params.p0).toBe("alpha");
        expect(db.dialect._params.p1).toBe("beta");
        db.close();
    });

    test("db.dialect.autoIncrement() returns 'AUTOINCREMENT'", () => {
        const { db } = setup();
        expect(db.dialect.autoIncrement()).toBe("AUTOINCREMENT");
        db.close();
    });

    test("db.dialect.compileLimitOffset({limit:10}) returns ' LIMIT 10'", () => {
        const { db } = setup();
        expect(db.dialect.compileLimitOffset({ limit: 10, offset: null })).toBe(" LIMIT 10");
        db.close();
    });

    test("db.dialect.compileLimitOffset({limit:10,offset:5}) returns ' LIMIT 10 OFFSET 5'", () => {
        const { db } = setup();
        expect(db.dialect.compileLimitOffset({ limit: 10, offset: 5 })).toBe(" LIMIT 10 OFFSET 5");
        db.close();
    });

    test("db.dialect.compileLimitOffset({}) returns empty string", () => {
        const { db } = setup();
        expect(db.dialect.compileLimitOffset({ limit: null, offset: null })).toBe("");
        db.close();
    });

    test("db.dialect.quote('users') returns 'users'", () => {
        const { db } = setup();
        expect(db.dialect.quote("users")).toBe("users");
        db.close();
    });

    test("db.dialect.columnType('INT') returns 'INTEGER'", () => {
        const { db } = setup();
        expect(db.dialect.columnType("INT")).toBe("INTEGER");
        db.close();
    });

    test("db.dialect.columnType('TEXT') returns 'TEXT'", () => {
        const { db } = setup();
        expect(db.dialect.columnType("TEXT")).toBe("TEXT");
        db.close();
    });

    test("db.dialect.compileSelect produces SQL with SELECT", () => {
        const { db, users } = setup();
        const plan = db.from(users).toPlan();
        const result = db.dialect.compileSelect(plan);
        expect(result.query.includes("SELECT")).toBe(true);
        db.close();
    });

    test("db.dialect.compileInsert produces SQL with INSERT INTO", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 1, name: "Test" }).toPlan();
        const result = db.dialect.compileInsert(plan);
        expect(result.query.includes("INSERT INTO")).toBe(true);
        db.close();
    });

    test("db.dialect.compileUpdate produces SQL with UPDATE SET", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).update({ name: "Updated" }).toPlan();
        const result = db.dialect.compileUpdate(plan);
        expect(result.query.includes("UPDATE")).toBe(true);
        expect(result.query.includes("SET")).toBe(true);
        db.close();
    });

    test("db.dialect.compileDelete produces SQL with DELETE FROM", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).delete().toPlan();
        const result = db.dialect.compileDelete(plan);
        expect(result.query.includes("DELETE FROM")).toBe(true);
        db.close();
    });

    test("compileSelect with where includes WHERE clause", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).toPlan();
        const result = db.dialect.compileSelect(plan);
        expect(result.query.includes("WHERE")).toBe(true);
        db.close();
    });

    test("compileSelect with orders includes ORDER BY", () => {
        const { db, users } = setup();
        const plan = db.from(users).orderBy("name").toPlan();
        const result = db.dialect.compileSelect(plan);
        expect(result.query.includes("ORDER BY")).toBe(true);
        db.close();
    });

    test("compileSelect with limit includes LIMIT", () => {
        const { db, users } = setup();
        const plan = db.from(users).take(5).toPlan();
        const result = db.dialect.compileSelect(plan);
        expect(result.query.includes("LIMIT")).toBe(true);
        db.close();
    });

    test("db.dialect.compileCreateTable produces CREATE TABLE", () => {
        const { db } = setup();
        const schema = defineTable("products", { id: { type: "INT", primaryKey: true }, name: { type: "TEXT" } });
        const result = db.dialect.compileCreateTable(schema);
        expect(result.includes("CREATE TABLE")).toBe(true);
        db.close();
    });
});
