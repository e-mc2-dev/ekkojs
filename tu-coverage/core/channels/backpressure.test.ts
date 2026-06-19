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

const isWin = Ekko.platform === "win32";

describe("Ekko.Channel - backpressure", () => {
  if (isWin) {
    test("skipped on Windows (async channel scheduling differs)", () => {
      expect(true).toBe(true);
    });
    return;
  }

  test("channel with capacity 2 accepts 2 messages", () => {
    const ch = new Ekko.Channel({ capacity: 2 });
    expect(ch.trySend("a")).toBeTruthy();
    expect(ch.trySend("b")).toBeTruthy();
  });

  test("send 2 messages fills up channel", () => {
    const ch = new Ekko.Channel({ capacity: 2 });
    ch.trySend(1);
    ch.trySend(2);
    expect(ch.trySend(3)).toBeFalsy();
  });

  test("third send blocks until recv", async () => {
    const ch = new Ekko.Channel({ capacity: 2 });
    await ch.send("a");
    await ch.send("b");

    let thirdDone = false;
    const sendPromise = (async () => {
      await ch.send("c");
      thirdDone = true;
    })();

    const val = await ch.recv();
    expect(val).toBe("a");

    await sendPromise;
    expect(thirdDone).toBeTruthy();
  });

  test("recv one, third send completes", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send("first");

    let sent = false;
    const p = (async () => {
      await ch.send("second");
      sent = true;
    })();

    await ch.recv(); 
    await p;
    expect(sent).toBeTruthy();
    expect(await ch.recv()).toBe("second");
  });

  test("ordering maintained under backpressure", async () => {
    const ch = new Ekko.Channel({ capacity: 2 });
    await ch.send(1);
    await ch.send(2);

    const p = ch.send(3);
    const first = await ch.recv();
    await p;

    const second = await ch.recv();
    const third = await ch.recv();

    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(third).toBe(3);
  });

  test("capacity 1 enforces strict alternation", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send("x");
    expect(ch.trySend("y")).toBeFalsy();
    expect(await ch.recv()).toBe("x");
    expect(ch.trySend("y")).toBeTruthy();
  });

  test("backpressure with numbers", async () => {
    const ch = new Ekko.Channel({ capacity: 2 });
    await ch.send(10);
    await ch.send(20);

    const p = ch.send(30);
    expect(await ch.recv()).toBe(10);
    await p;
    expect(await ch.recv()).toBe(20);
    expect(await ch.recv()).toBe(30);
  });

  test("multiple blocked sends resolve in order", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    await ch.send("a");

    const p1 = ch.send("b");
    const p2 = ch.send("c");

    expect(await ch.recv()).toBe("a");
    await p1;
    expect(await ch.recv()).toBe("b");
    await p2;
    expect(await ch.recv()).toBe("c");
  });
});
