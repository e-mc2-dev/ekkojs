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
    const users = defineTable("users", { id:{type:"INT",primaryKey:true}, name:{type:"TEXT"}, age:{type:"INT"}, city:{type:"TEXT"} });
    db.createTable(users);
    db.from(users).insert({id:1,name:"Alice",age:30,city:"NYC"}).exec();
    db.from(users).insert({id:2,name:"Bob",age:25,city:"LA"}).exec();
    db.from(users).insert({id:3,name:"Charlie",age:35,city:"NYC"}).exec();
    db.from(users).insert({id:4,name:"Diana",age:28,city:"Chicago"}).exec();
    db.from(users).insert({id:5,name:"Eve",age:22,city:"LA"}).exec();
    return { db, users };
}

describe("ORM immutability deep", () => {
    test("10 chained operations each return different query", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const q1 = base.where(u => u.age.gt(20));
        const q2 = q1.where(u => u.age.lt(40));
        const q3 = q2.orderBy("name");
        const q4 = q3.take(3);
        const q5 = q4.skip(1);
        const q6 = base.where({city: "NYC"});
        const q7 = q6.orderByDesc("age");
        const q8 = q7.take(1);
        const q9 = base.where({name: "Alice"});
        const q10 = base.where({name: "Bob"});
        expect(q9.first().name).toBe("Alice");
        expect(q10.first().name).toBe("Bob");
    });

    test("fork: q1 = base.where(A), q2 = base.where(B) different results", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const q1 = base.where({city: "NYC"});
        const q2 = base.where({city: "LA"});
        const r1 = q1.toArray();
        const r2 = q2.toArray();
        expect(r1.length).toBe(2);
        expect(r2.length).toBe(2);
        expect(r1[0].city).toBe("NYC");
        expect(r2[0].city).toBe("LA");
    });

    test("fork: q1.count() and q2.count() different", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const q1 = base.where(u => u.age.gt(30));
        const q2 = base.where(u => u.age.lt(25));
        expect(q1.count()).toBe(1);
        expect(q2.count()).toBe(1);
    });

    test("original unaffected after 5 chains", () => {
        const { db, users } = setup();
        const base = db.from(users);
        base.where(u => u.age.gt(30));
        base.where({city: "NYC"});
        base.orderBy("name");
        base.take(2);
        base.skip(1);
        const all = base.toArray();
        expect(all.length).toBe(5);
    });

    test("toPlan() on original shows no wheres after fork", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const forked = base.where(u => u.age.gt(30));
        const plan = base.toPlan();
        expect(plan.where).toBe(null);
    });

    test("select() on fork does not change original fields", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const forked = base.select("name");
        const planBase = base.toPlan();
        const planFork = forked.toPlan();
        expect(planBase.fields[0]).toBe("*");
        expect(planFork.fields[0]).toBe("name");
    });

    test("orderBy on fork does not change original orders", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const forked = base.orderBy("name");
        const planBase = base.toPlan();
        expect(planBase.orders.length).toBe(0);
    });

    test("take on fork does not change original limit", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const forked = base.take(2);
        const allBase = base.toArray();
        const allFork = forked.toArray();
        expect(allBase.length).toBe(5);
        expect(allFork.length).toBe(2);
    });

    test("terminal (toArray) does not change query state", () => {
        const { db, users } = setup();
        const q = db.from(users).where({city: "NYC"});
        const r1 = q.toArray();
        const r2 = q.toArray();
        expect(r1.length).toBe(r2.length);
        expect(r1[0].name).toBe(r2[0].name);
    });

    test("terminal (count) does not change query state", () => {
        const { db, users } = setup();
        const q = db.from(users).where({city: "NYC"});
        const c1 = q.count();
        const c2 = q.count();
        expect(c1).toBe(c2);
    });

    test("two terminals on same query return same result", () => {
        const { db, users } = setup();
        const q = db.from(users).where(u => u.age.gt(25));
        const arr = q.toArray();
        const cnt = q.count();
        expect(arr.length).toBe(cnt);
    });

    test("toSQL() twice returns same string", () => {
        const { db, users } = setup();
        const q = db.from(users).where(u => u.age.gt(25)).orderBy("name");
        const sql1 = q.toSQL();
        const sql2 = q.toSQL();
        expect(sql1).toBe(sql2);
    });

    test("toPlan() twice returns same structure", () => {
        const { db, users } = setup();
        const q = db.from(users).where(u => u.age.gt(25)).orderBy("name").take(3);
        const plan1 = q.toPlan();
        const plan2 = q.toPlan();
        expect(JSON.stringify(plan1)).toBe(JSON.stringify(plan2));
    });

    test("chain: base.where(A).where(B).orderBy(C).take(D) each step isolated", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const step1 = base.where(u => u.age.gt(20));
        const step2 = step1.where(u => u.age.lt(35));
        const step3 = step2.orderBy("name");
        const step4 = step3.take(2);

        expect(base.toArray().length).toBe(5);
        expect(step1.toArray().length).toBe(5);
        
        expect(step2.toArray().length).toBe(4);
        expect(step4.toArray().length).toBe(2);
    });

    test("20 forks from same base all independent", () => {
        const { db, users } = setup();
        const base = db.from(users);
        const forks = [];
        for (let i = 1; i <= 20; i++) {
            forks.push(base.where(u => u.age.gt(i)));
        }
        
        expect(forks[0].count()).toBe(5);   
        expect(forks[19].count()).toBe(5);  
        expect(base.count()).toBe(5);       
        
        const strict = base.where(u => u.age.gt(30));
        expect(strict.count()).toBe(1);
        
        expect(base.count()).toBe(5);
    });
});
