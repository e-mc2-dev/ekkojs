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

describe("ekko:orm — Driver Registry", () => {
    test("orm.registerDriver is a function", () => {
        expect(typeof orm.registerDriver).toBe("function");
    });

    test("orm.connect is a function", () => {
        expect(typeof orm.connect).toBe("function");
    });

    test("orm.connect('sqlite', Database(':memory:')) works", () => {
        const db = orm.connect("sqlite", Database(":memory:"));
        expect(db).not.toBe(null);
        expect(db).not.toBe(undefined);
        db.close();
    });

    test("connect(Database(':memory:')) backward compat works", () => {
        const db = connect(Database(":memory:"));
        expect(db).not.toBe(null);
        expect(db).not.toBe(undefined);
        db.close();
    });

    test("orm.registerDriver('mock', factory) registers", () => {
        let called = false;
        orm.registerDriver("mock", (config) => {
            called = true;
            return {
                dialect: new orm.SqliteDialect(),
                execute: (sql, params) => ({ affectedRows: 0 }),
                query: (sql, params) => ({ columns: [], rows: [] }),
                beginTransaction: () => {},
                commit: () => {},
                rollback: () => {},
                close: () => {}
            };
        });
        expect(called).toBe(false);
    });

    test("orm.connect('mock', config) calls factory", () => {
        let factoryCalled = false;
        orm.registerDriver("mock2", (config) => {
            factoryCalled = true;
            return {
                dialect: new orm.SqliteDialect(),
                execute: (sql, params) => ({ affectedRows: 0 }),
                query: (sql, params) => ({ columns: [], rows: [] }),
                beginTransaction: () => {},
                commit: () => {},
                rollback: () => {},
                close: () => {}
            };
        });
        const db = orm.connect("mock2", {});
        expect(factoryCalled).toBe(true);
        db.close();
    });

    test("orm.connect('unknown') throws with useful message", () => {
        let threw = false;
        try {
            orm.connect("unknown_driver_xyz", {});
        } catch (e) {
            threw = true;
            expect(e.message.includes("unknown_driver_xyz")).toBe(true);
        }
        expect(threw).toBe(true);
    });

    test("Custom driver factory receives config", () => {
        let receivedConfig = null;
        orm.registerDriver("configtest", (config) => {
            receivedConfig = config;
            return {
                dialect: new orm.SqliteDialect(),
                execute: (sql, params) => ({ affectedRows: 0 }),
                query: (sql, params) => ({ columns: [], rows: [] }),
                beginTransaction: () => {},
                commit: () => {},
                rollback: () => {},
                close: () => {}
            };
        });
        orm.connect("configtest", { host: "localhost", port: 5432 });
        expect(receivedConfig.host).toBe("localhost");
        expect(receivedConfig.port).toBe(5432);
    });

    test("Multiple drivers registered independently", () => {
        let driverA = false;
        let driverB = false;
        orm.registerDriver("driverA", (config) => {
            driverA = true;
            return {
                dialect: new orm.SqliteDialect(),
                execute: () => ({ affectedRows: 0 }),
                query: () => ({ columns: [], rows: [] }),
                beginTransaction: () => {},
                commit: () => {},
                rollback: () => {},
                close: () => {}
            };
        });
        orm.registerDriver("driverB", (config) => {
            driverB = true;
            return {
                dialect: new orm.SqliteDialect(),
                execute: () => ({ affectedRows: 0 }),
                query: () => ({ columns: [], rows: [] }),
                beginTransaction: () => {},
                commit: () => {},
                rollback: () => {},
                close: () => {}
            };
        });
        orm.connect("driverA", {});
        expect(driverA).toBe(true);
        expect(driverB).toBe(false);
        orm.connect("driverB", {});
        expect(driverB).toBe(true);
    });

    test("Custom driver's connection is used for queries", () => {
        orm.registerDriver("querydriver", (config) => {
            return {
                dialect: new orm.SqliteDialect(),
                execute: (sql, params) => ({ affectedRows: 42 }),
                query: (sql, params) => ({ columns: ["x"], rows: [{ x: 999 }] }),
                beginTransaction: () => {},
                commit: () => {},
                rollback: () => {},
                close: () => {}
            };
        });
        const db = orm.connect("querydriver", {});
        const result = db.query("SELECT 1");
        expect(result.rows[0].x).toBe(999);
        db.close();
    });

    test("orm.Dialect class exists", () => {
        expect(orm.Dialect).not.toBe(undefined);
    });

    test("orm.SqliteDialect class exists", () => {
        expect(orm.SqliteDialect).not.toBe(undefined);
    });
});
