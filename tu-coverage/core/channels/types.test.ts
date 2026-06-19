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

describe("channel message types - numbers", () => {
  test("send/recv number 0", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send(0);
    const val = await ch.recv();
    expect(val).toBe(0);
  });

  test("send/recv negative number", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send(-999);
    const val = await ch.recv();
    expect(val).toBe(-999);
  });

  test("send/recv float 3.14", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send(3.14);
    const val = await ch.recv();
    expect(val).toBe(3.14);
  });
});

describe("channel message types - strings", () => {
  test("send/recv empty string ''", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send("");
    const val = await ch.recv();
    expect(val).toBe("");
  });

  test("send/recv long string (1000 chars)", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    let longStr = "";
    for (let i = 0; i < 1000; i++) {
      longStr += "a";
    }
    await ch.send(longStr);
    const val = await ch.recv();
    expect(val).toHaveLength(1000);
    expect(val).toBe(longStr);
  });

  test("send/recv special chars in string", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    const special = "hello\nworld\ttab\"quote\\back";
    await ch.send(special);
    const val = await ch.recv();
    expect(val).toContain("hello");
    expect(val).toContain("world");
    expect(val).toContain("tab");
  });
});

describe("channel message types - booleans and null", () => {
  test("send/recv boolean true", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send(true);
    const val = await ch.recv();
    expect(val).toBe(true);
  });

  test("send/recv boolean false", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send(false);
    const val = await ch.recv();
    expect(val).toBe(false);
  });

  test("send/recv null", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send(null);
    const val = await ch.recv();
    expect(val).toBeNull();
  });
});

describe("channel message types - objects and arrays", () => {
  test("send/recv empty object {}", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send({});
    const val = await ch.recv();
    expect(val).toEqual({});
  });

  test("send/recv empty array []", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send([]);
    const val = await ch.recv();
    expect(val).toEqual([]);
  });

  test("send/recv nested object", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    const nested = {
      user: {
        name: "Alice",
        address: {
          city: "Paris",
          zip: "75001",
        },
        scores: [10, 20, 30],
      },
    };
    await ch.send(nested);
    const val = await ch.recv();
    expect(val).toEqual(nested);
    expect(val.user.name).toBe("Alice");
    expect(val.user.address.city).toBe("Paris");
    expect(val.user.scores).toHaveLength(3);
  });

  test("send/recv array of objects", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    const arr = [
      { id: 1, label: "first" },
      { id: 2, label: "second" },
      { id: 3, label: "third" },
    ];
    await ch.send(arr);
    const val = await ch.recv();
    expect(val).toHaveLength(3);
    expect(val[0].id).toBe(1);
    expect(val[1].label).toBe("second");
    expect(val[2]).toEqual({ id: 3, label: "third" });
  });
});
