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

describe("Ekko.Channel - stress", () => {
  test("send 100 messages through channel with capacity 10", async () => {
    const ch = Ekko.Channel({ capacity: 10 });
    const received: number[] = [];

    const producer = (async () => {
      for (let i = 0; i < 100; i++) {
        await ch.send(i);
      }
    })();

    const consumer = (async () => {
      for (let i = 0; i < 100; i++) {
        received.push(await ch.recv() as number);
      }
    })();

    await Promise.all([producer, consumer]);
    expect(received).toHaveLength(100);
  });

  test("verify all 100 messages received", async () => {
    const ch = Ekko.Channel({ capacity: 10 });
    const received: number[] = [];

    const producer = (async () => {
      for (let i = 0; i < 100; i++) {
        await ch.send(i);
      }
    })();

    const consumer = (async () => {
      for (let i = 0; i < 100; i++) {
        received.push(await ch.recv() as number);
      }
    })();

    await Promise.all([producer, consumer]);
    for (let i = 0; i < 100; i++) {
      expect(received[i]).toBe(i);
    }
  });

  test("ordering preserved with 100 messages", async () => {
    const ch = Ekko.Channel({ capacity: 5 });
    const results: number[] = [];

    const p = (async () => {
      for (let i = 0; i < 100; i++) {
        await ch.send(i);
      }
    })();

    const c = (async () => {
      for (let i = 0; i < 100; i++) {
        results.push(await ch.recv() as number);
      }
    })();

    await Promise.all([p, c]);
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBeGreaterThan(results[i - 1]);
    }
  });

  test("multiple producers, verify all messages received", async () => {
    const ch = Ekko.Channel({ capacity: 10 });
    const count = 30;

    const p1 = Ekko.spawn(async (ch, count) => {
      for (let i = 0; i < count; i++) {
        await ch.send("p1");
      }
    }, [ch, count]);

    const p2 = Ekko.spawn(async (ch, count) => {
      for (let i = 0; i < count; i++) {
        await ch.send("p2");
      }
    }, [ch, count]);

    const received: string[] = [];
    const consumer = (async () => {
      for (let i = 0; i < count * 2; i++) {
        received.push(await ch.recv() as string);
      }
    })();

    await Promise.all([p1, p2, consumer]);
    expect(received).toHaveLength(count * 2);

    const p1Count = received.filter((m) => m === "p1").length;
    const p2Count = received.filter((m) => m === "p2").length;
    expect(p1Count).toBe(count);
    expect(p2Count).toBe(count);
  });

  test("rapid trySend/tryRecv cycle", () => {
    const ch = Ekko.Channel({ capacity: 1 });
    let success = 0;
    for (let i = 0; i < 50; i++) {
      if (ch.trySend(i)) {
        const val = ch.tryRecv();
        if (val === i) success++;
      }
    }
    expect(success).toBe(50);
  });

  test("channel survives many open/close cycles", () => {
    for (let i = 0; i < 20; i++) {
      const ch = Ekko.Channel({ capacity: 2 });
      ch.trySend(i);
      expect(ch.tryRecv()).toBe(i);
      ch.close();
    }
  });
});
