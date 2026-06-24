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

describe("ekko:orm — Dialect SELECT SQL Generation", () => {
    test("Basic SELECT * FROM table", () => {
        const { db, users } = setup();
        const sql = db.from(users).toSQL();
        expect(sql.includes("SELECT")).toBe(true);
        expect(sql.includes("*")).toBe(true);
        expect(sql.includes("FROM")).toBe(true);
        expect(sql.includes("users")).toBe(true);
        db.close();
    });

    test("SELECT with specific fields", () => {
        const { db, users } = setup();
        const sql = db.from(users).select("name", "age").toSQL();
        expect(sql.includes("name")).toBe(true);
        expect(sql.includes("age")).toBe(true);
        expect(sql.includes("*")).toBe(false);
        db.close();
    });

    test("SELECT DISTINCT", () => {
        const { db, users } = setup();
        const sql = db.from(users).distinct().toSQL();
        expect(sql.includes("DISTINCT")).toBe(true);
        db.close();
    });

    test("SELECT with single WHERE =", () => {
        const { db, users } = setup();
        const sql = db.from(users).where({ id: 1 }).toSQL();
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("id")).toBe(true);
        expect(sql.includes("=")).toBe(true);
        db.close();
    });

    test("SELECT with WHERE >", () => {
        const { db, users } = setup();
        const sql = db.from(users).where(u => u.age.gt(25)).toSQL();
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("age")).toBe(true);
        expect(sql.includes(">")).toBe(true);
        db.close();
    });

    test("SELECT with WHERE <", () => {
        const { db, users } = setup();
        const sql = db.from(users).where(u => u.age.lt(30)).toSQL();
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("age")).toBe(true);
        expect(sql.includes("<")).toBe(true);
        db.close();
    });

    test("SELECT with WHERE >=", () => {
        const { db, users } = setup();
        const sql = db.from(users).where(u => u.age.gte(25)).toSQL();
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("age")).toBe(true);
        expect(sql.includes(">=")).toBe(true);
        db.close();
    });

    test("SELECT with WHERE <=", () => {
        const { db, users } = setup();
        const sql = db.from(users).where(u => u.age.lte(30)).toSQL();
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("age")).toBe(true);
        expect(sql.includes("<=")).toBe(true);
        db.close();
    });

    test("SELECT with WHERE LIKE", () => {
        const { db, users } = setup();
        const sql = db.from(users).where(u => u.name.like("%li%")).toSQL();
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("LIKE")).toBe(true);
        expect(sql.includes("name")).toBe(true);
        db.close();
    });

    test("SELECT with WHERE IN", () => {
        const { db, users } = setup();
        const sql = db.from(users).where(u => u.name.isIn(["Alice", "Bob"])).toSQL();
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("IN")).toBe(true);
        expect(sql.includes("name")).toBe(true);
        db.close();
    });

    test("SELECT with WHERE IS NULL", () => {
        const { db, users } = setup();
        const sql = db.from(users).where(u => u.email.isNull()).toSQL();
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("IS NULL")).toBe(true);
        expect(sql.includes("email")).toBe(true);
        db.close();
    });

    test("SELECT with WHERE IS NOT NULL", () => {
        const { db, users } = setup();
        const sql = db.from(users).where(u => u.email.isNotNull()).toSQL();
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("IS NOT NULL")).toBe(true);
        expect(sql.includes("email")).toBe(true);
        db.close();
    });

    test("SELECT with multiple WHERE (AND)", () => {
        const { db, users } = setup();
        const sql = db.from(users).where(u => u.age.gt(20)).where(u => u.age.lt(40)).toSQL();
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("AND")).toBe(true);
        db.close();
    });

    test("SELECT with ORDER BY ASC", () => {
        const { db, users } = setup();
        const sql = db.from(users).orderBy("name").toSQL();
        expect(sql.includes("ORDER BY")).toBe(true);
        expect(sql.includes("name")).toBe(true);
        expect(sql.includes("ASC")).toBe(true);
        db.close();
    });

    test("SELECT with ORDER BY DESC", () => {
        const { db, users } = setup();
        const sql = db.from(users).orderByDesc("name").toSQL();
        expect(sql.includes("ORDER BY")).toBe(true);
        expect(sql.includes("name")).toBe(true);
        expect(sql.includes("DESC")).toBe(true);
        db.close();
    });

    test("SELECT with multiple ORDER BY", () => {
        const { db, users } = setup();
        const sql = db.from(users).orderBy("name").orderByDesc("age").toSQL();
        expect(sql.includes("ORDER BY")).toBe(true);
        expect(sql.includes("name")).toBe(true);
        expect(sql.includes("age")).toBe(true);
        db.close();
    });

    test("SELECT with LIMIT", () => {
        const { db, users } = setup();
        const sql = db.from(users).take(10).toSQL();
        expect(sql.includes("LIMIT")).toBe(true);
        expect(sql.includes("10")).toBe(true);
        db.close();
    });

    test("SELECT with OFFSET", () => {
        const { db, users } = setup();
        const sql = db.from(users).skip(5).take(10).toSQL();
        expect(sql.includes("OFFSET")).toBe(true);
        expect(sql.includes("5")).toBe(true);
        db.close();
    });

    test("SELECT with LIMIT + OFFSET", () => {
        const { db, users } = setup();
        const sql = db.from(users).take(10).skip(5).toSQL();
        expect(sql.includes("LIMIT")).toBe(true);
        expect(sql.includes("OFFSET")).toBe(true);
        expect(sql.includes("10")).toBe(true);
        expect(sql.includes("5")).toBe(true);
        db.close();
    });

    test("SELECT with JOIN", () => {
        const { db, users } = setup();
        const sql = db.from(users).join("orders", "users.id = orders.user_id").toSQL();
        expect(sql.includes("JOIN")).toBe(true);
        expect(sql.includes("orders")).toBe(true);
        expect(sql.includes("users.id = orders.user_id")).toBe(true);
        db.close();
    });

    test("SELECT with LEFT JOIN", () => {
        const { db, users } = setup();
        const sql = db.from(users).leftJoin("orders", "users.id = orders.user_id").toSQL();
        expect(sql.includes("LEFT JOIN")).toBe(true);
        expect(sql.includes("orders")).toBe(true);
        expect(sql.includes("users.id = orders.user_id")).toBe(true);
        db.close();
    });

    test("SELECT with GROUP BY", () => {
        const { db, users } = setup();
        const sql = db.from(users).groupBy("age").toSQL();
        expect(sql.includes("GROUP BY")).toBe(true);
        expect(sql.includes("age")).toBe(true);
        db.close();
    });

    test("SELECT with GROUP BY + HAVING", () => {
        const { db, users } = setup();
        const sql = db.from(users).groupBy("age").having(u => u.age.gt(1)).toSQL();
        expect(sql.includes("GROUP BY")).toBe(true);
        expect(sql.includes("HAVING")).toBe(true);
        
        expect(sql.includes("age")).toBe(true);
        expect(sql.includes(">")).toBe(true);
        db.close();
    });

    test("SELECT with all clauses combined (WHERE + ORDER + LIMIT + JOIN)", () => {
        const { db, users } = setup();
        const sql = db.from(users)
            .join("orders", "users.id = orders.user_id")
            .where(u => u.age.gt(20))
            .orderBy("name")
            .take(10)
            .skip(2)
            .toSQL();
        expect(sql.includes("JOIN")).toBe(true);
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("ORDER BY")).toBe(true);
        expect(sql.includes("LIMIT")).toBe(true);
        expect(sql.includes("OFFSET")).toBe(true);
        db.close();
    });

    test("SELECT with DISTINCT + WHERE + ORDER", () => {
        const { db, users } = setup();
        const sql = db.from(users).distinct().where(u => u.age.gt(20)).orderBy("name").toSQL();
        expect(sql.includes("DISTINCT")).toBe(true);
        expect(sql.includes("WHERE")).toBe(true);
        expect(sql.includes("ORDER BY")).toBe(true);
        db.close();
    });

    test("Field list uses comma separation", () => {
        const { db, users } = setup();
        const sql = db.from(users).select("name", "age", "email").toSQL();
        expect(sql.includes("name")).toBe(true);
        expect(sql.includes("age")).toBe(true);
        expect(sql.includes("email")).toBe(true);
        expect(sql.includes(",")).toBe(true);
        db.close();
    });

    test("WHERE params use @name format", () => {
        const { db, users } = setup();
        const plan = db.from(users).where({ id: 1 }).toPlan();
        const result = db.dialect.compileSelect(plan);
        expect(result.query.includes("@")).toBe(true);
        db.close();
    });

    test("Table name in FROM clause", () => {
        const { db, users } = setup();
        const sql = db.from(users).toSQL();
        const fromIdx = sql.indexOf("FROM");
        const usersIdx = sql.indexOf("users");
        expect(fromIdx).not.toBe(-1);
        expect(usersIdx).not.toBe(-1);
        expect(usersIdx > fromIdx).toBe(true);
        db.close();
    });

    test("JOIN table in JOIN clause", () => {
        const { db, users } = setup();
        const sql = db.from(users).join("orders", "users.id = orders.user_id").toSQL();
        const joinIdx = sql.indexOf("JOIN");
        const ordersIdx = sql.indexOf("orders");
        expect(joinIdx).not.toBe(-1);
        expect(ordersIdx).not.toBe(-1);
        expect(ordersIdx > joinIdx).toBe(true);
        db.close();
    });

    test("ORDER direction in ORDER BY clause", () => {
        const { db, users } = setup();
        const sqlAsc = db.from(users).orderBy("name").toSQL();
        const sqlDesc = db.from(users).orderByDesc("name").toSQL();
        expect(sqlAsc.includes("ASC")).toBe(true);
        expect(sqlDesc.includes("DESC")).toBe(true);
        db.close();
    });
});
