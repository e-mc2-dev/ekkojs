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
import { Database } from "ekko:db";
import { tempFile, remove, exists } from "ekko:fs";

function createTestDb() {
  const db = Database(":memory:");
  db.exec("CREATE TABLE products (id INT PRIMARY KEY, name TEXT, price DOUBLE, category TEXT, stock INT)");
  db.exec("INSERT INTO products (id, name, price, category, stock) VALUES (1, 'Widget', 9.99, 'tools', 100)");
  db.exec("INSERT INTO products (id, name, price, category, stock) VALUES (2, 'Gadget', 24.50, 'electronics', 50)");
  db.exec("INSERT INTO products (id, name, price, category, stock) VALUES (3, 'Sprocket', 4.75, 'tools', 200)");
  db.exec("INSERT INTO products (id, name, price, category, stock) VALUES (4, 'Doohickey', 15.00, 'electronics', 75)");
  db.exec("INSERT INTO products (id, name, price, category, stock) VALUES (5, 'Thingamajig', 7.50, 'misc', 30)");
  return db;
}

describe("INSERT and COUNT", () => {
  test("INSERT multiple rows then COUNT returns correct total", () => {
    const db = createTestDb();
    const q = db.query("SELECT COUNT(*) FROM products");
    expect(q.rows[0][0]).toBe(5);
    db.close();
  });
});

describe("SELECT with WHERE conditions", () => {
  test("SELECT with WHERE AND condition", () => {
    const db = createTestDb();
    const q = db.query("SELECT name FROM products WHERE category = 'tools' AND price < 10");
    expect(q.rows.length).toBe(2);
    db.close();
  });

  test("SELECT with WHERE OR condition", () => {
    const db = createTestDb();
    const q = db.query("SELECT name FROM products WHERE category = 'misc' OR price > 20");
    expect(q.rows.length).toBe(2);
    db.close();
  });
});

describe("SELECT with ORDER BY", () => {
  test("SELECT with ORDER BY ASC", () => {
    const db = createTestDb();
    const q = db.query("SELECT name FROM products ORDER BY price ASC");
    expect(q.rows[0][0]).toBe("Sprocket");
    expect(q.rows[4][0]).toBe("Gadget");
    db.close();
  });

  test("SELECT with ORDER BY DESC", () => {
    const db = createTestDb();
    const q = db.query("SELECT name FROM products ORDER BY price DESC");
    expect(q.rows[0][0]).toBe("Gadget");
    expect(q.rows[4][0]).toBe("Sprocket");
    db.close();
  });
});

describe("SELECT with LIMIT and OFFSET", () => {
  test("SELECT with LIMIT", () => {
    const db = createTestDb();
    const q = db.query("SELECT name FROM products ORDER BY id LIMIT 3");
    expect(q.rows.length).toBe(3);
    expect(q.rows[0][0]).toBe("Widget");
    expect(q.rows[2][0]).toBe("Sprocket");
    db.close();
  });

  test("SELECT with LIMIT and OFFSET", () => {
    const db = createTestDb();
    const q = db.query("SELECT name FROM products ORDER BY id LIMIT 2 OFFSET 2");
    expect(q.rows.length).toBe(2);
    expect(q.rows[0][0]).toBe("Sprocket");
    expect(q.rows[1][0]).toBe("Doohickey");
    db.close();
  });
});

describe("UPDATE and DELETE with WHERE", () => {
  test("UPDATE with WHERE condition", () => {
    const db = createTestDb();
    db.exec("UPDATE products SET price = 19.99 WHERE category = 'tools'");
    const q = db.query("SELECT price FROM products WHERE name = 'Widget'");
    expect(q.rows[0][0]).toBe(19.99);
    const q2 = db.query("SELECT price FROM products WHERE name = 'Sprocket'");
    expect(q2.rows[0][0]).toBe(19.99);
    db.close();
  });

  test("DELETE with WHERE condition", () => {
    const db = createTestDb();
    db.exec("DELETE FROM products WHERE category = 'misc'");
    const q = db.query("SELECT COUNT(*) FROM products");
    expect(q.rows[0][0]).toBe(4);
    const q2 = db.query("SELECT * FROM products WHERE name = 'Thingamajig'");
    expect(q2.rows.length).toBe(0);
    db.close();
  });
});

describe("aggregate functions", () => {
  test("SUM of price", () => {
    const db = createTestDb();
    const q = db.query("SELECT SUM(price) FROM products");
    
    const sum = q.rows[0][0] as number;
    expect(sum > 61).toBe(true);
    expect(sum < 62).toBe(true);
    db.close();
  });

  test("AVG of stock", () => {
    const db = createTestDb();
    const q = db.query("SELECT AVG(stock) FROM products");
    
    expect(q.rows[0][0]).toBe(91);
    db.close();
  });

  test("MIN and MAX of price", () => {
    const db = createTestDb();
    const qMin = db.query("SELECT MIN(price) FROM products");
    expect(qMin.rows[0][0]).toBe(4.75);
    const qMax = db.query("SELECT MAX(price) FROM products");
    expect(qMax.rows[0][0]).toBe(24.50);
    db.close();
  });
});

describe("CREATE INDEX", () => {
  test("CREATE INDEX does not error", () => {
    const db = createTestDb();
    let threw = false;
    try {
      db.exec("CREATE INDEX idx_category ON products (category)");
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    
    const q = db.query("SELECT name FROM products WHERE category = 'tools' ORDER BY id");
    expect(q.rows.length).toBe(2);
    db.close();
  });
});

describe("transaction-like behavior (multiple operations)", () => {
  test("batch insert, update, and delete in sequence", () => {
    const db = Database(":memory:");
    db.exec("CREATE TABLE ledger (id INT PRIMARY KEY, amount DOUBLE, status TEXT)");
    
    for (let i = 1; i <= 10; i++) {
      db.exec("INSERT INTO ledger (id, amount, status) VALUES (" + i + ", " + (i * 10) + ", 'pending')");
    }
    const q1 = db.query("SELECT COUNT(*) FROM ledger");
    expect(q1.rows[0][0]).toBe(10);

    db.exec("UPDATE ledger SET status = 'complete' WHERE id <= 5");
    const q2 = db.query("SELECT COUNT(*) FROM ledger WHERE status = 'complete'");
    expect(q2.rows[0][0]).toBe(5);

    db.exec("DELETE FROM ledger WHERE status = 'complete'");
    const q3 = db.query("SELECT COUNT(*) FROM ledger");
    expect(q3.rows[0][0]).toBe(5);

    db.close();
  });
});

describe("reopen database preserves data", () => {
  test("data persists after close and reopen with file db", () => {
    const path = tempFile("ekko-db-advanced", ".triodb");
    remove(path);

    const db1 = Database(path);
    db1.exec("CREATE TABLE settings (k TEXT PRIMARY KEY, val TEXT)");
    db1.exec("INSERT INTO settings (k, val) VALUES ('theme', 'dark')");
    db1.exec("INSERT INTO settings (k, val) VALUES ('lang', 'en')");
    db1.close();

    const db2 = Database(path);
    const q = db2.query("SELECT val FROM settings WHERE k = 'theme'");
    expect(q.rows.length).toBe(1);
    expect(q.rows[0][0]).toBe("dark");

    const q2 = db2.query("SELECT COUNT(*) FROM settings");
    expect(q2.rows[0][0]).toBe(2);
    db2.close();

    remove(path);
  });
});
