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
    const users = defineTable("users", { id:{type:"INT",primaryKey:true}, name:{type:"TEXT"} });
    const posts = defineTable("posts", { id:{type:"INT",primaryKey:true}, userId:{type:"INT"}, title:{type:"TEXT"} });
    const tags = defineTable("tags", { id:{type:"INT",primaryKey:true}, postId:{type:"INT"}, tag:{type:"TEXT"} });
    db.createTable(users);
    db.createTable(posts);
    db.createTable(tags);
    return { db, users, posts, tags };
}

describe("ORM multi-table operations", () => {
    test("create 3 tables independently", () => {
        const { db, users, posts, tags } = setup();
        expect(db.from(users).count()).toBe(0);
        expect(db.from(posts).count()).toBe(0);
        expect(db.from(tags).count()).toBe(0);
    });

    test("insert into each table independently", () => {
        const { db, users, posts, tags } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Hello"}).exec();
        db.from(tags).insert({id:1,postId:1,tag:"intro"}).exec();
        expect(db.from(users).count()).toBe(1);
        expect(db.from(posts).count()).toBe(1);
        expect(db.from(tags).count()).toBe(1);
    });

    test("query each table independently", () => {
        const { db, users, posts, tags } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Hello"}).exec();
        db.from(tags).insert({id:1,postId:1,tag:"intro"}).exec();
        const u = db.from(users).first();
        const p = db.from(posts).first();
        const t = db.from(tags).first();
        expect(u.name).toBe("Alice");
        expect(p.title).toBe("Hello");
        expect(t.tag).toBe("intro");
    });

    test("count on each table independent", () => {
        const { db, users, posts, tags } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(users).insert({id:2,name:"Bob"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Post1"}).exec();
        expect(db.from(users).count()).toBe(2);
        expect(db.from(posts).count()).toBe(1);
        expect(db.from(tags).count()).toBe(0);
    });

    test("insert user then insert posts for that user", () => {
        const { db, users, posts } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Post A"}).exec();
        db.from(posts).insert({id:2,userId:1,title:"Post B"}).exec();
        db.from(posts).insert({id:3,userId:1,title:"Post C"}).exec();
        const userPosts = db.from(posts).where({userId: 1}).toArray();
        expect(userPosts.length).toBe(3);
    });

    test("query posts by userId", () => {
        const { db, users, posts } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(users).insert({id:2,name:"Bob"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Alice Post"}).exec();
        db.from(posts).insert({id:2,userId:2,title:"Bob Post"}).exec();
        db.from(posts).insert({id:3,userId:1,title:"Alice Post 2"}).exec();
        const alicePosts = db.from(posts).where({userId: 1}).toArray();
        expect(alicePosts.length).toBe(2);
        const bobPosts = db.from(posts).where({userId: 2}).toArray();
        expect(bobPosts.length).toBe(1);
    });

    test("delete user does not affect posts (no cascade)", () => {
        const { db, users, posts } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Post"}).exec();
        db.from(users).where({id: 1}).delete().exec();
        expect(db.from(users).count()).toBe(0);
        expect(db.from(posts).count()).toBe(1);
    });

    test("update user does not affect posts", () => {
        const { db, users, posts } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Post"}).exec();
        db.from(users).where({id: 1}).update({name:"Alicia"}).exec();
        const post = db.from(posts).first();
        expect(post.userId).toBe(1);
        expect(post.title).toBe("Post");
    });

    test("tables have independent schemas", () => {
        const { db, users, posts } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Hello"}).exec();
        const u = db.from(users).first();
        const p = db.from(posts).first();
        expect(u.name).not.toBeUndefined();
        expect(u.title).toBeUndefined();
        expect(p.title).not.toBeUndefined();
        expect(p.name).toBeUndefined();
    });

    test("drop one table, others still work", () => {
        const { db, users, posts, tags } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Post"}).exec();
        db.from(tags).insert({id:1,postId:1,tag:"test"}).exec();
        db.dropTable(tags);
        expect(db.from(users).count()).toBe(1);
        expect(db.from(posts).count()).toBe(1);
    });

    test("3 tables x multiple rows = independent counts", () => {
        const { db, users, posts, tags } = setup();
        for (let i = 1; i <= 10; i++) {
            db.from(users).insert({id:i,name:`User${i}`}).exec();
        }
        for (let i = 1; i <= 5; i++) {
            db.from(posts).insert({id:i,userId:1,title:`Post${i}`}).exec();
        }
        for (let i = 1; i <= 3; i++) {
            db.from(tags).insert({id:i,postId:1,tag:`tag${i}`}).exec();
        }
        expect(db.from(users).count()).toBe(10);
        expect(db.from(posts).count()).toBe(5);
        expect(db.from(tags).count()).toBe(3);
    });

    test("from(users).count() + from(posts).count() independent", () => {
        const { db, users, posts } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"P1"}).exec();
        db.from(posts).insert({id:2,userId:1,title:"P2"}).exec();
        const uc = db.from(users).count();
        const pc = db.from(posts).count();
        expect(uc).toBe(1);
        expect(pc).toBe(2);
        expect(uc + pc).toBe(3);
    });

    test("same db context, different tables", () => {
        const { db, users, posts } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Post"}).exec();
        const u = db.from(users).where({id: 1}).first();
        const p = db.from(posts).where({id: 1}).first();
        expect(u.name).toBe("Alice");
        expect(p.title).toBe("Post");
    });

    test("transaction across multiple tables", () => {
        const { db, users, posts } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({id:1,name:"Alice"}).exec();
            tx.from(posts).insert({id:1,userId:1,title:"Post"}).exec();
        });
        expect(db.from(users).count()).toBe(1);
        expect(db.from(posts).count()).toBe(1);
    });

    test("rollback across multiple tables reverts all", () => {
        const { db, users, posts } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({id:1,name:"Alice"}).exec();
                tx.from(posts).insert({id:1,userId:1,title:"Post"}).exec();
                throw new Error("rollback");
            });
        } catch (e) {
            
        }
        expect(db.from(users).count()).toBe(0);
        expect(db.from(posts).count()).toBe(0);
    });

    test("sequential operations across tables", () => {
        const { db, users, posts, tags } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Post"}).exec();
        db.from(tags).insert({id:1,postId:1,tag:"first"}).exec();
        db.from(users).where({id: 1}).update({name:"Alicia"}).exec();
        db.from(posts).where({id: 1}).update({title:"Updated Post"}).exec();
        db.from(tags).where({id: 1}).delete().exec();
        expect(db.from(users).first().name).toBe("Alicia");
        expect(db.from(posts).first().title).toBe("Updated Post");
        expect(db.from(tags).count()).toBe(0);
    });

    test("bulk: 10 users + 30 posts + 50 tags", () => {
        const { db, users, posts, tags } = setup();
        for (let i = 1; i <= 10; i++) {
            db.from(users).insert({id:i,name:`User${i}`}).exec();
        }
        for (let i = 1; i <= 30; i++) {
            db.from(posts).insert({id:i,userId:((i-1)%10)+1,title:`Post${i}`}).exec();
        }
        for (let i = 1; i <= 50; i++) {
            db.from(tags).insert({id:i,postId:((i-1)%30)+1,tag:`tag${i}`}).exec();
        }
        expect(db.from(users).count()).toBe(10);
        expect(db.from(posts).count()).toBe(30);
        expect(db.from(tags).count()).toBe(50);
    });

    test("query posts where userId matches specific user", () => {
        const { db, users, posts } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(users).insert({id:2,name:"Bob"}).exec();
        for (let i = 1; i <= 5; i++) {
            db.from(posts).insert({id:i,userId:1,title:`Alice Post ${i}`}).exec();
        }
        for (let i = 6; i <= 8; i++) {
            db.from(posts).insert({id:i,userId:2,title:`Bob Post ${i}`}).exec();
        }
        const alicePosts = db.from(posts).where({userId: 1}).toArray();
        const bobPosts = db.from(posts).where({userId: 2}).toArray();
        expect(alicePosts.length).toBe(5);
        expect(bobPosts.length).toBe(3);
    });

    test("delete all from one table, others unchanged", () => {
        const { db, users, posts, tags } = setup();
        db.from(users).insert({id:1,name:"Alice"}).exec();
        db.from(posts).insert({id:1,userId:1,title:"Post"}).exec();
        db.from(tags).insert({id:1,postId:1,tag:"test"}).exec();
        db.from(posts).delete().exec();
        expect(db.from(users).count()).toBe(1);
        expect(db.from(posts).count()).toBe(0);
        expect(db.from(tags).count()).toBe(1);
    });
});
