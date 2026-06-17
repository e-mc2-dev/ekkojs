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

describe("Ekko.Channel - async iterator", () => {
  test("for await receives messages", async () => {
    const ch = new Ekko.Channel({ capacity: 3 });
    await ch.send("a");
    await ch.send("b");
    await ch.send("c");
    ch.close();

    const received: string[] = [];
    for await (const msg of ch) {
      received.push(msg as string);
    }
    expect(received).toEqual(["a", "b", "c"]);
  });

  test("iterator stops after channel close", async () => {
    const ch = new Ekko.Channel({ capacity: 2 });
    await ch.send("only");
    ch.close();

    const received: string[] = [];
    for await (const msg of ch) {
      received.push(msg as string);
    }
    expect(received).toHaveLength(1);
    expect(received[0]).toBe("only");
  });

  test("send 3 messages, iterate, get all 3", async () => {
    const ch = new Ekko.Channel({ capacity: 5 });
    await ch.send(1);
    await ch.send(2);
    await ch.send(3);
    ch.close();

    const results: number[] = [];
    for await (const msg of ch) {
      results.push(msg as number);
    }
    expect(results).toEqual([1, 2, 3]);
    expect(results).toHaveLength(3);
  });

  test("close during iteration stops loop", async () => {
    const ch = new Ekko.Channel({ capacity: 5 });
    await ch.send("x");
    await ch.send("y");
    ch.close();

    let count = 0;
    for await (const _ of ch) {
      count++;
    }
    expect(count).toBe(2);
  });

  test("empty closed channel yields nothing", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    ch.close();

    let count = 0;
    for await (const _ of ch) {
      count++;
    }
    expect(count).toBe(0);
  });

  test("iterate numbers in order", async () => {
    const ch = new Ekko.Channel({ capacity: 5 });
    for (let i = 0; i < 5; i++) {
      await ch.send(i);
    }
    ch.close();

    let idx = 0;
    for await (const msg of ch) {
      expect(msg).toBe(idx);
      idx++;
    }
    expect(idx).toBe(5);
  });
});
