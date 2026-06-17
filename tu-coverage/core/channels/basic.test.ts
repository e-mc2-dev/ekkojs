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

describe("Ekko.Channel - basic", () => {
  test("create channel with default capacity", () => {
    const ch = new Ekko.Channel();
    expect(ch).toBeTruthy();
  });

  test("create channel with explicit capacity", () => {
    const ch = new Ekko.Channel({ capacity: 4 });
    expect(ch).toBeTruthy();
  });

  test("send string, recv string", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send("hello");
    const val = await ch.recv();
    expect(val).toBe("hello");
  });

  test("send number, recv number", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send(42);
    const val = await ch.recv();
    expect(val).toBe(42);
  });

  test("send object, recv object", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send({ key: "value" });
    const val = await ch.recv();
    expect(val).toEqual({ key: "value" });
  });

  test("send array, recv array", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send([1, 2, 3]);
    const val = await ch.recv();
    expect(val).toEqual([1, 2, 3]);
  });

  test("send then recv immediately", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send("fast");
    const val = await ch.recv();
    expect(val).toBe("fast");
  });

  test("multiple send/recv pairs in sequence", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send("first");
    expect(await ch.recv()).toBe("first");

    await ch.send("second");
    expect(await ch.recv()).toBe("second");

    await ch.send("third");
    expect(await ch.recv()).toBe("third");
  });

  test("send boolean, recv boolean", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send(true);
    const val = await ch.recv();
    expect(val).toBe(true);
  });

  test("send zero, recv zero", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send(0);
    const val = await ch.recv();
    expect(val).toBe(0);
  });
});
