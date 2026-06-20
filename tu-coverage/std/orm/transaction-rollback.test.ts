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

describe("ekko:orm — Transaction Rollback", () => {
    test("Throw inside transaction causes rollback", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 10, name: "Ghost", email: "ghost@t.com", age: 99 }).exec();
                throw new Error("rollback");
            });
        } catch (e) {
            
        }
        expect(db.from(users).count()).toBe(5);
        db.close();
    });

    test("Data NOT visible after rollback", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 10, name: "Invisible", email: "inv@t.com", age: 50 }).exec();
                throw new Error("abort");
            });
        } catch (e) {
            
        }
        const row = db.from(users).where({ id: 10 }).first();
        expect(row).toBe(null);
        db.close();
    });

    test("Count unchanged after rollback", () => {
        const { db, users } = setup();
        const before = db.from(users).count();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 10, name: "X", email: "x@t.com", age: 10 }).exec();
                tx.from(users).insert({ id: 11, name: "Y", email: "y@t.com", age: 11 }).exec();
                throw new Error("rollback");
            });
        } catch (e) {
            
        }
        expect(db.from(users).count()).toBe(before);
        db.close();
    });

    test("Insert rolled back on error", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 99, name: "RollbackInsert", email: "ri@t.com", age: 1 }).exec();
                throw new Error("fail");
            });
        } catch (e) {
            
        }
        expect(db.from(users).where({ id: 99 }).exists()).toBe(false);
        db.close();
    });

    test("Update rolled back on error", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).where({ id: 1 }).update({ name: "CHANGED" }).exec();
                throw new Error("fail");
            });
        } catch (e) {
            
        }
        expect(db.from(users).where({ id: 1 }).first().name).toBe("Alice");
        db.close();
    });

    test("Delete rolled back on error", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).where({ id: 3 }).delete().exec();
                throw new Error("fail");
            });
        } catch (e) {
            
        }
        expect(db.from(users).where({ id: 3 }).exists()).toBe(true);
        expect(db.from(users).where({ id: 3 }).first().name).toBe("Charlie");
        db.close();
    });

    test("Multiple operations all rolled back", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 10, name: "New1", email: "n1@t.com", age: 10 }).exec();
                tx.from(users).where({ id: 1 }).update({ age: 999 }).exec();
                tx.from(users).where({ id: 2 }).delete().exec();
                throw new Error("rollback all");
            });
        } catch (e) {
            
        }
        expect(db.from(users).where({ id: 10 }).exists()).toBe(false);
        expect(db.from(users).where({ id: 1 }).first().age).toBe(30);
        expect(db.from(users).where({ id: 2 }).exists()).toBe(true);
        db.close();
    });

    test("Error propagates from transaction", () => {
        const { db, users } = setup();
        let caught = false;
        try {
            db.transaction((tx) => {
                throw new Error("propagate me");
            });
        } catch (e) {
            caught = true;
        }
        expect(caught).toBe(true);
        db.close();
    });

    test("Error message preserved", () => {
        const { db, users } = setup();
        let message = "";
        try {
            db.transaction((tx) => {
                throw new Error("specific message");
            });
        } catch (e) {
            message = e.message;
        }
        expect(message).toBe("specific message");
        db.close();
    });

    test("Original data unchanged after rollback", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).where({ id: 1 }).update({ name: "X", email: "x@x.com", age: 0 }).exec();
                throw new Error("revert");
            });
        } catch (e) {
            
        }
        const alice = db.from(users).where({ id: 1 }).first();
        expect(alice.name).toBe("Alice");
        expect(alice.email).toBe("alice@test.com");
        expect(alice.age).toBe(30);
        db.close();
    });

    test("Partial operations rolled back (insert 3, throw before 4th)", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 10, name: "A", email: "a@t.com", age: 10 }).exec();
                tx.from(users).insert({ id: 11, name: "B", email: "b@t.com", age: 11 }).exec();
                tx.from(users).insert({ id: 12, name: "C", email: "c@t.com", age: 12 }).exec();
                throw new Error("abort before 4th");
            });
        } catch (e) {
            
        }
        expect(db.from(users).where({ id: 10 }).exists()).toBe(false);
        expect(db.from(users).where({ id: 11 }).exists()).toBe(false);
        expect(db.from(users).where({ id: 12 }).exists()).toBe(false);
        expect(db.from(users).count()).toBe(5);
        db.close();
    });

    test("Thrown Error type preserved", () => {
        const { db, users } = setup();
        let caughtType = "";
        try {
            db.transaction((tx) => {
                throw new TypeError("type check");
            });
        } catch (e) {
            caughtType = e.constructor.name;
        }
        expect(caughtType).toBe("TypeError");
        db.close();
    });

    test("Thrown string error works", () => {
        const { db, users } = setup();
        let caught = false;
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 10, name: "X", email: "x@t.com", age: 10 }).exec();
                throw "string error";
            });
        } catch (e) {
            caught = true;
        }
        expect(caught).toBe(true);
        expect(db.from(users).where({ id: 10 }).exists()).toBe(false);
        db.close();
    });

    test("RangeError thrown rolls back", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 10, name: "Range", email: "r@t.com", age: 10 }).exec();
                throw new RangeError("out of range");
            });
        } catch (e) {
            expect(e.constructor.name).toBe("RangeError");
        }
        expect(db.from(users).where({ id: 10 }).exists()).toBe(false);
        db.close();
    });

    test("Transaction state clean after rollback (can do new transaction)", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 10, name: "Failed", email: "f@t.com", age: 10 }).exec();
                throw new Error("fail first");
            });
        } catch (e) {
            
        }
        
        db.transaction((tx) => {
            tx.from(users).insert({ id: 20, name: "Success", email: "s@t.com", age: 20 }).exec();
        });
        expect(db.from(users).where({ id: 10 }).exists()).toBe(false);
        expect(db.from(users).where({ id: 20 }).exists()).toBe(true);
        db.close();
    });

    test("Sequential: commit then rollback — first persists, second doesn't", () => {
        const { db, users } = setup();
        db.transaction((tx) => {
            tx.from(users).insert({ id: 10, name: "Committed", email: "c@t.com", age: 10 }).exec();
        });
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 11, name: "RolledBack", email: "rb@t.com", age: 11 }).exec();
                throw new Error("rollback second");
            });
        } catch (e) {
            
        }
        expect(db.from(users).where({ id: 10 }).exists()).toBe(true);
        expect(db.from(users).where({ id: 11 }).exists()).toBe(false);
        db.close();
    });

    test("Sequential: rollback then commit — first reverts, second persists", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 10, name: "Reverted", email: "rv@t.com", age: 10 }).exec();
                throw new Error("rollback first");
            });
        } catch (e) {
            
        }
        db.transaction((tx) => {
            tx.from(users).insert({ id: 11, name: "Persisted", email: "p@t.com", age: 11 }).exec();
        });
        expect(db.from(users).where({ id: 10 }).exists()).toBe(false);
        expect(db.from(users).where({ id: 11 }).exists()).toBe(true);
        db.close();
    });

    test("Rollback with update doesn't change original values", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).where({ id: 2 }).update({ name: "NotBob", age: 999 }).exec();
                throw new Error("revert");
            });
        } catch (e) {
            
        }
        const bob = db.from(users).where({ id: 2 }).first();
        expect(bob.name).toBe("Bob");
        expect(bob.age).toBe(25);
        db.close();
    });

    test("Verify exact row values after rollback match pre-transaction", () => {
        const { db, users } = setup();
        const before = db.from(users).orderBy("id").toArray();
        try {
            db.transaction((tx) => {
                tx.from(users).where({ id: 1 }).update({ age: 0 }).exec();
                tx.from(users).where({ id: 3 }).delete().exec();
                tx.from(users).insert({ id: 99, name: "Z", email: "z@t.com", age: 99 }).exec();
                throw new Error("revert all");
            });
        } catch (e) {
            
        }
        const after = db.from(users).orderBy("id").toArray();
        expect(after.length).toBe(before.length);
        for (let i = 0; i < before.length; i++) {
            expect(after[i].id).toBe(before[i].id);
            expect(after[i].name).toBe(before[i].name);
            expect(after[i].age).toBe(before[i].age);
        }
        db.close();
    });

    test("Complex: insert + update + throw — both reverted", () => {
        const { db, users } = setup();
        try {
            db.transaction((tx) => {
                tx.from(users).insert({ id: 50, name: "Temp", email: "tmp@t.com", age: 50 }).exec();
                tx.from(users).where({ id: 50 }).update({ name: "TempUpdated" }).exec();
                tx.from(users).where({ id: 1 }).update({ age: 0 }).exec();
                throw new Error("complex rollback");
            });
        } catch (e) {
            
        }
        expect(db.from(users).where({ id: 50 }).exists()).toBe(false);
        expect(db.from(users).where({ id: 1 }).first().age).toBe(30);
        db.close();
    });
});
