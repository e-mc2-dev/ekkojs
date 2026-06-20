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

describe("ekko:orm — Dialect Parameter Handling", () => {
    test("Single param indexed correctly", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).toPlan();
        const result = db.dialect.compileSelect(plan);
        const vals = Object.values(result.params);
        expect(vals.length).toBe(1);
        expect(vals[0]).toBe(1);
        db.close();
    });

    test("Multiple params indexed sequentially", () => {
        const { db, users } = setup();
        const plan = db.from(users).where(u => u.age.gt(20)).where(u => u.age.lt(40)).toPlan();
        const result = db.dialect.compileSelect(plan);
        const vals = Object.values(result.params);
        expect(vals.length).toBe(2);
        expect(vals[0]).toBe(20);
        expect(vals[1]).toBe(40);
        db.close();
    });

    test("Named param uses field name in SQL", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ name: "Alice" }).toPlan();
        const result = db.dialect.compileSelect(plan);
        expect(result.query.includes("@")).toBe(true);
        const vals = Object.values(result.params);
        expect(vals[0]).toBe("Alice");
        db.close();
    });

    test("WHERE = generates param correctly", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ age: 30 }).toPlan();
        const result = db.dialect.compileSelect(plan);
        expect(result.query.includes("=")).toBe(true);
        expect(result.query.includes("@")).toBe(true);
        const vals = Object.values(result.params);
        expect(vals[0]).toBe(30);
        db.close();
    });

    test("WHERE > generates param correctly", () => {
        const { db, users } = setup();
        const plan = db.from(users).where(u => u.age.gt(25)).toPlan();
        const result = db.dialect.compileSelect(plan);
        expect(result.query.includes(">")).toBe(true);
        const vals = Object.values(result.params);
        expect(vals[0]).toBe(25);
        db.close();
    });

    test("WHERE < generates param correctly", () => {
        const { db, users } = setup();
        const plan = db.from(users).where(u => u.age.lt(30)).toPlan();
        const result = db.dialect.compileSelect(plan);
        expect(result.query.includes("<")).toBe(true);
        const vals = Object.values(result.params);
        expect(vals[0]).toBe(30);
        db.close();
    });

    test("INSERT params named after columns", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "Test" }).toPlan();
        const result = db.dialect.compileInsert(plan);
        expect(result.query.includes("@")).toBe(true);
        const vals = Object.values(result.params);
        let has10 = false;
        let hasTest = false;
        for (const p of vals) {
            if (p === 10) has10 = true;
            if (p === "Test") hasTest = true;
        }
        expect(has10).toBe(true);
        expect(hasTest).toBe(true);
        db.close();
    });

    test("UPDATE params present for SET values", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).update({ name: "NewVal" }).toPlan();
        const result = db.dialect.compileUpdate(plan);
        let hasNewVal = false;
        for (const p of Object.values(result.params)) {
            if (p === "NewVal") hasNewVal = true;
        }
        expect(hasNewVal).toBe(true);
        db.close();
    });

    test("WHERE params present in UPDATE query", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 5 }).update({ name: "X" }).toPlan();
        const result = db.dialect.compileUpdate(plan);
        let has5 = false;
        for (const p of Object.values(result.params)) {
            if (p === 5) has5 = true;
        }
        expect(has5).toBe(true);
        db.close();
    });

    test("Params don't collide between WHERE and UPDATE", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).update({ age: 1 }).toPlan();
        const result = db.dialect.compileUpdate(plan);
        
        const vals = Object.values(result.params);
        expect(vals.length >= 2).toBe(true);
        db.close();
    });

    test("Special characters in string values (quotes)", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "O'Brien" }).toPlan();
        const result = db.dialect.compileInsert(plan);
        let hasQuote = false;
        for (const p of Object.values(result.params)) {
            if (p === "O'Brien") hasQuote = true;
        }
        expect(hasQuote).toBe(true);
        db.close();
    });

    test("Empty string as param value", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: "" }).toPlan();
        const result = db.dialect.compileInsert(plan);
        let hasEmpty = false;
        for (const p of Object.values(result.params)) {
            if (p === "") hasEmpty = true;
        }
        expect(hasEmpty).toBe(true);
        db.close();
    });

    test("Zero as param value", () => {
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

    test("Null handling in params", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 10, name: null }).toPlan();
        const result = db.dialect.compileInsert(plan);
        let hasNull = false;
        for (const p of Object.values(result.params)) {
            if (p === null) hasNull = true;
        }
        expect(hasNull).toBe(true);
        db.close();
    });

    test("Large number as param value", () => {
        const { db, users } = setup();
        const plan = db.from(users).insert({ id: 999999, name: "Big" }).toPlan();
        const result = db.dialect.compileInsert(plan);
        let hasBig = false;
        for (const p of Object.values(result.params)) {
            if (p === 999999) hasBig = true;
        }
        expect(hasBig).toBe(true);
        db.close();
    });

    test("Multiple WHERE conditions each get unique param name", () => {
        const { db, users } = setup();
        const plan = db.from(users).where(u => u.age.gt(20)).where(u => u.age.lt(40)).where({ name: "Alice" }).toPlan();
        const result = db.dialect.compileSelect(plan);
        const vals = Object.values(result.params);
        expect(vals.length).toBe(3);
        
        const atMatches = result.query.match(/@\w+/g);
        expect(atMatches).not.toBe(null);
        const unique = new Set(atMatches);
        expect(unique.size).toBe(atMatches.length);
        db.close();
    });

    test("IN clause placeholders present in SQL with all values bound", () => {
        const { db, users } = setup();
        const plan = db.from(users).where(u => u.name.isIn(["Alice", "Bob"])).toPlan();
        const result = db.dialect.compileSelect(plan);
        expect(result.query.includes("IN")).toBe(true);
        const vals = Object.values(result.params);
        expect(vals.includes("Alice")).toBe(true);
        expect(vals.includes("Bob")).toBe(true);
        db.close();
    });

    test("IS NULL doesn't generate params", () => {
        const { db, users } = setup();
        const plan = db.from(users).where(u => u.email.isNull()).toPlan();
        const result = db.dialect.compileSelect(plan);
        const vals = Object.values(result.params);
        expect(vals.length).toBe(0);
        db.close();
    });

    test("Param count matches placeholder count", () => {
        const { db, users } = setup();
        const plan = db.from(users).where(u => u.age.gt(20)).where(u => u.age.lt(40)).toPlan();
        const result = db.dialect.compileSelect(plan);
        const atMatches = result.query.match(/@\w+/g);
        expect(atMatches).not.toBe(null);
        const vals = Object.values(result.params);
        expect(atMatches.length).toBe(vals.length);
        db.close();
    });

    test("toSQL() result is valid SQL (no trailing commas/spaces)", () => {
        const { db, users } = setup();
        const sql = db.from(users).select("name", "age").where({ id: 1 }).toSQL();
        expect(sql.endsWith(",")).toBe(false);
        expect(sql.endsWith(" ,")).toBe(false);
        expect(sql.trim()).toBe(sql);
        db.close();
    });
});
