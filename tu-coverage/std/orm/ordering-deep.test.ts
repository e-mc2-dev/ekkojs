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
    const users = defineTable("users", { id:{type:"INT",primaryKey:true}, name:{type:"TEXT"}, age:{type:"INT"} });
    db.createTable(users);
    db.from(users).insert({id:1,name:"Alice",age:30}).exec();
    db.from(users).insert({id:2,name:"Bob",age:25}).exec();
    db.from(users).insert({id:3,name:"Charlie",age:35}).exec();
    db.from(users).insert({id:4,name:"Diana",age:28}).exec();
    db.from(users).insert({id:5,name:"Eve",age:22}).exec();
    return { db, users };
}

describe("ORM ordering deep", () => {
    test("orderBy(name) returns alphabetical order", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("name").toArray();
        expect(result[0].name).toBe("Alice");
        expect(result[1].name).toBe("Bob");
        expect(result[2].name).toBe("Charlie");
        expect(result[3].name).toBe("Diana");
        expect(result[4].name).toBe("Eve");
    });

    test("orderByDesc(name) returns reverse alphabetical", () => {
        const { db, users } = setup();
        const result = db.from(users).orderByDesc("name").toArray();
        expect(result[0].name).toBe("Eve");
        expect(result[1].name).toBe("Diana");
        expect(result[2].name).toBe("Charlie");
        expect(result[3].name).toBe("Bob");
        expect(result[4].name).toBe("Alice");
    });

    test("orderBy(age) returns numeric ascending", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("age").toArray();
        expect(result[0].age).toBe(22);
        expect(result[1].age).toBe(25);
        expect(result[2].age).toBe(28);
        expect(result[3].age).toBe(30);
        expect(result[4].age).toBe(35);
    });

    test("orderByDesc(age) returns numeric descending", () => {
        const { db, users } = setup();
        const result = db.from(users).orderByDesc("age").toArray();
        expect(result[0].age).toBe(35);
        expect(result[1].age).toBe(30);
        expect(result[2].age).toBe(28);
        expect(result[3].age).toBe(25);
        expect(result[4].age).toBe(22);
    });

    test("orderBy(name).first() returns Alice", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("name").first();
        expect(result.name).toBe("Alice");
    });

    test("orderByDesc(name).first() returns Eve", () => {
        const { db, users } = setup();
        const result = db.from(users).orderByDesc("name").first();
        expect(result.name).toBe("Eve");
    });

    test("orderBy(age).first() returns Eve (youngest)", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("age").first();
        expect(result.name).toBe("Eve");
    });

    test("orderByDesc(age).first() returns Charlie (oldest)", () => {
        const { db, users } = setup();
        const result = db.from(users).orderByDesc("age").first();
        expect(result.name).toBe("Charlie");
    });

    test("take(1) returns single result", () => {
        const { db, users } = setup();
        const result = db.from(users).take(1).toArray();
        expect(result.length).toBe(1);
    });

    test("take(2) returns exactly 2", () => {
        const { db, users } = setup();
        const result = db.from(users).take(2).toArray();
        expect(result.length).toBe(2);
    });

    test("take(3) returns exactly 3", () => {
        const { db, users } = setup();
        const result = db.from(users).take(3).toArray();
        expect(result.length).toBe(3);
    });

    test("take(0) returns empty", () => {
        const { db, users } = setup();
        const result = db.from(users).take(0).toArray();
        expect(result.length).toBe(0);
    });

    test("take(100) returns all 5 (capped at actual)", () => {
        const { db, users } = setup();
        const result = db.from(users).take(100).toArray();
        expect(result.length).toBe(5);
    });

    test("skip(1) returns 4 results", () => {
        const { db, users } = setup();
        const result = db.from(users).take(9999).skip(1).toArray();
        expect(result.length).toBe(4);
    });

    test("skip(2) returns 3 results", () => {
        const { db, users } = setup();
        const result = db.from(users).take(9999).skip(2).toArray();
        expect(result.length).toBe(3);
    });

    test("skip(4) returns 1 result", () => {
        const { db, users } = setup();
        const result = db.from(users).take(9999).skip(4).toArray();
        expect(result.length).toBe(1);
    });

    test("skip(5) returns 0 results (past end)", () => {
        const { db, users } = setup();
        const result = db.from(users).take(9999).skip(5).toArray();
        expect(result.length).toBe(0);
    });

    test("skip(100) returns empty", () => {
        const { db, users } = setup();
        const result = db.from(users).take(9999).skip(100).toArray();
        expect(result.length).toBe(0);
    });

    test("pagination: skip(0).take(2) = page 1", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("id").take(2).toArray();
        expect(result.length).toBe(2);
        expect(result[0].id).toBe(1);
        expect(result[1].id).toBe(2);
    });

    test("pagination: skip(2).take(2) = page 2", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("id").skip(2).take(2).toArray();
        expect(result.length).toBe(2);
        expect(result[0].id).toBe(3);
        expect(result[1].id).toBe(4);
    });

    test("pagination: skip(4).take(2) = page 3 (1 item)", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("id").skip(4).take(2).toArray();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(5);
    });

    test("orderBy + take = sorted first N", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("age").take(3).toArray();
        expect(result.length).toBe(3);
        expect(result[0].age).toBe(22);
        expect(result[2].age).toBe(28);
    });

    test("orderByDesc + take = sorted last N", () => {
        const { db, users } = setup();
        const result = db.from(users).orderByDesc("age").take(3).toArray();
        expect(result.length).toBe(3);
        expect(result[0].age).toBe(35);
        expect(result[2].age).toBe(28);
    });

    test("orderBy + skip + take = sorted middle", () => {
        const { db, users } = setup();
        const result = db.from(users).orderBy("age").skip(1).take(3).toArray();
        expect(result.length).toBe(3);
        expect(result[0].age).toBe(25);
        expect(result[1].age).toBe(28);
        expect(result[2].age).toBe(30);
    });

    test("multiple orderBy: secondary sort", () => {
        const { db, users } = setup();
        
        db.from(users).insert({id:6,name:"Zara",age:25}).exec();
        db.from(users).insert({id:7,name:"Aaron",age:25}).exec();
        const result = db.from(users).orderBy("age").orderBy("name").toArray();
        
        const age25 = result.filter((r: any) => r.age === 25);
        expect(age25[0].name).toBe("Aaron");
        expect(age25[1].name).toBe("Bob");
        expect(age25[2].name).toBe("Zara");
    });
});
