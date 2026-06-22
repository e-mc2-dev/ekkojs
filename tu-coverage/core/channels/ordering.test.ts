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

describe("Ekko.Channel - ordering", () => {
  test("send 1,2,3,4,5 — recv in FIFO order", async () => {
    const ch = new Ekko.Channel({ capacity: 5 });
    for (let i = 1; i <= 5; i++) {
      await ch.send(i);
    }
    for (let i = 1; i <= 5; i++) {
      expect(await ch.recv()).toBe(i);
    }
  });

  test("send strings in order, recv in same order", async () => {
    const ch = new Ekko.Channel({ capacity: 5 });
    const items = ["alpha", "bravo", "charlie", "delta", "echo"];
    for (const item of items) {
      await ch.send(item);
    }
    for (const item of items) {
      expect(await ch.recv()).toBe(item);
    }
  });

  test("rapid send/recv maintains order", async () => {
    const ch = new Ekko.Channel({ capacity: 10 });
    const sent: number[] = [];
    for (let i = 0; i < 10; i++) {
      await ch.send(i);
      sent.push(i);
    }
    const received: number[] = [];
    for (let i = 0; i < 10; i++) {
      received.push(await ch.recv() as number);
    }
    expect(received).toEqual(sent);
  });

  test("interleaved send and recv preserves order", async () => {
    const ch = new Ekko.Channel({ capacity: 2 });
    await ch.send(1);
    await ch.send(2);
    expect(await ch.recv()).toBe(1);
    await ch.send(3);
    expect(await ch.recv()).toBe(2);
    expect(await ch.recv()).toBe(3);
  });

  test("trySend and tryRecv maintain FIFO", () => {
    const ch = new Ekko.Channel({ capacity: 3 });
    ch.trySend("x");
    ch.trySend("y");
    ch.trySend("z");
    expect(ch.tryRecv()).toBe("x");
    expect(ch.tryRecv()).toBe("y");
    expect(ch.tryRecv()).toBe("z");
  });

  test("ordering with mixed types", async () => {
    const ch = new Ekko.Channel({ capacity: 4 });
    await ch.send(1);
    await ch.send("two");
    await ch.send(true);
    await ch.send(null);
    expect(await ch.recv()).toBe(1);
    expect(await ch.recv()).toBe("two");
    expect(await ch.recv()).toBe(true);
    expect(await ch.recv()).toBeNull();
  });
});
