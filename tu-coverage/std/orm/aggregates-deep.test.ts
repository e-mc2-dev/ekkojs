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
    const products = defineTable("products", { id:{type:"INT",primaryKey:true}, name:{type:"TEXT"}, price:{type:"DOUBLE"}, category:{type:"TEXT"}, stock:{type:"INT"} });
    db.createTable(products);
    db.from(products).insert({id:1,name:"Widget",price:9.99,category:"tools",stock:100}).exec();
    db.from(products).insert({id:2,name:"Gadget",price:24.50,category:"tools",stock:50}).exec();
    db.from(products).insert({id:3,name:"Doohickey",price:4.99,category:"parts",stock:200}).exec();
    db.from(products).insert({id:4,name:"Thingamajig",price:99.99,category:"premium",stock:10}).exec();
    db.from(products).insert({id:5,name:"Whatsit",price:14.99,category:"parts",stock:75}).exec();
    db.from(products).insert({id:6,name:"Gizmo",price:49.99,category:"tools",stock:30}).exec();
    return { db, products };
}

function closeTo(actual, expected, precision) {
    const tol = Math.pow(10, -(precision || 2)) / 2;
    return Math.abs(actual - expected) < tol;
}

describe("ORM aggregates deep", () => {
    test("count() all returns 6", () => {
        const { db, products } = setup();
        const result = db.from(products).count();
        expect(result).toBe(6);
    });

    test("count() where category=tools returns 3", () => {
        const { db, products } = setup();
        const result = db.from(products).where({category: "tools"}).count();
        expect(result).toBe(3);
    });

    test("count() where price > 20 returns 3", () => {
        const { db, products } = setup();
        const result = db.from(products).where(p => p.price.gt(20)).count();
        expect(result).toBe(3);
    });

    test("sum(price) all products", () => {
        const { db, products } = setup();
        const result = db.from(products).sum("price");
        
        expect(closeTo(result, 204.45, 2)).toBe(true);
    });

    test("sum(stock) all products", () => {
        const { db, products } = setup();
        const result = db.from(products).sum("stock");
        expect(result).toBe(465);
    });

    test("sum(price) where category=tools", () => {
        const { db, products } = setup();
        const result = db.from(products).where({category: "tools"}).sum("price");
        
        expect(closeTo(result, 84.48, 2)).toBe(true);
    });

    test("avg(price) all products", () => {
        const { db, products } = setup();
        const result = db.from(products).avg("price");
        
        expect(closeTo(result, 34.075, 2)).toBe(true);
    });

    test("avg(stock) all products", () => {
        const { db, products } = setup();
        const result = db.from(products).avg("stock");
        
        expect(closeTo(result, 77.5, 1)).toBe(true);
    });

    test("avg(price) where category=parts", () => {
        const { db, products } = setup();
        const result = db.from(products).where({category: "parts"}).avg("price");
        
        expect(closeTo(result, 9.99, 2)).toBe(true);
    });

    test("min(price) returns 4.99", () => {
        const { db, products } = setup();
        const result = db.from(products).min("price");
        expect(closeTo(result, 4.99, 2)).toBe(true);
    });

    test("max(price) returns 99.99", () => {
        const { db, products } = setup();
        const result = db.from(products).max("price");
        expect(closeTo(result, 99.99, 2)).toBe(true);
    });

    test("min(stock) returns 10", () => {
        const { db, products } = setup();
        const result = db.from(products).min("stock");
        expect(result).toBe(10);
    });

    test("max(stock) returns 200", () => {
        const { db, products } = setup();
        const result = db.from(products).max("stock");
        expect(result).toBe(200);
    });

    test("min(price) where category=tools", () => {
        const { db, products } = setup();
        const result = db.from(products).where({category: "tools"}).min("price");
        expect(closeTo(result, 9.99, 2)).toBe(true);
    });

    test("max(price) where category=tools", () => {
        const { db, products } = setup();
        const result = db.from(products).where({category: "tools"}).max("price");
        expect(closeTo(result, 49.99, 2)).toBe(true);
    });

    test("sum(stock) where stock > 50", () => {
        const { db, products } = setup();
        const result = db.from(products).where(p => p.stock.gt(50)).sum("stock");
        expect(result).toBe(375);
    });

    test("count() where stock >= 100", () => {
        const { db, products } = setup();
        const result = db.from(products).where(p => p.stock.gte(100)).count();
        expect(result).toBe(2);
    });

    test("count() where price < 10", () => {
        const { db, products } = setup();
        const result = db.from(products).where(p => p.price.lt(10)).count();
        expect(result).toBe(2);
    });

    test("avg(price) where price > 10 AND price < 50 chained", () => {
        const { db, products } = setup();
        const result = db.from(products).where(p => p.price.gt(10)).where(p => p.price.lt(50)).avg("price");
        
        expect(closeTo(result, 29.83, 1)).toBe(true);
    });

    test("sum after delete reflects removal", () => {
        const { db, products } = setup();
        db.from(products).where({id: 4}).delete().exec();
        const result = db.from(products).sum("price");
        
        expect(closeTo(result, 104.46, 2)).toBe(true);
    });

    test("count after insert reflects addition", () => {
        const { db, products } = setup();
        db.from(products).insert({id:7,name:"Doodad",price:5.00,category:"parts",stock:60}).exec();
        const result = db.from(products).count();
        expect(result).toBe(7);
    });

    test("count() returns a number type", () => {
        const { db, products } = setup();
        const result = db.from(products).count();
        expect(typeof result).toBe("number");
    });

    test("sum() returns a number type", () => {
        const { db, products } = setup();
        const result = db.from(products).sum("price");
        expect(typeof result).toBe("number");
    });

    test("avg() returns a number type", () => {
        const { db, products } = setup();
        const result = db.from(products).avg("price");
        expect(typeof result).toBe("number");
    });

    test("sum on single row equals that row value", () => {
        const { db, products } = setup();
        const result = db.from(products).where({id: 1}).sum("price");
        expect(closeTo(result, 9.99, 2)).toBe(true);
    });

    test("avg on single row equals that row value", () => {
        const { db, products } = setup();
        const result = db.from(products).where({id: 1}).avg("price");
        expect(closeTo(result, 9.99, 2)).toBe(true);
    });

    test("min equals max when single row", () => {
        const { db, products } = setup();
        const min = db.from(products).where({id: 1}).min("price");
        const max = db.from(products).where({id: 1}).max("price");
        expect(min).toBe(max);
    });

    test("join + count is filtered by the join (issue 185)", () => {
        const db = connect(Database(":memory:"));
        const users = defineTable("users", { id: { type: "INT", primaryKey: true }, active: { type: "INT" } });
        const posts = defineTable("posts", { id: { type: "INT", primaryKey: true }, user_id: { type: "INT" } });
        db.createTable(users);
        db.createTable(posts);
        
        db.from(users).insert({ id: 1, active: 1 }).exec();
        db.from(users).insert({ id: 2, active: 0 }).exec();
        
        db.from(posts).insert({ id: 1, user_id: 1 }).exec();
        db.from(posts).insert({ id: 2, user_id: 1 }).exec();
        db.from(posts).insert({ id: 3, user_id: 1 }).exec();
        db.from(posts).insert({ id: 4, user_id: 2 }).exec();
        db.from(posts).insert({ id: 5, user_id: 2 }).exec();

        const n = db.from(posts)
            .join(users, (p, u) => p.user_id.eqField(u.id))
            .where(u => u["users.active"].eq(1))
            .count();
        expect(n).toBe(3); 
        db.close();
    });
});
