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

describe("Ekko.Channel - cross-thread", () => {
  test("spawn worker, worker sends, parent recvs", async () => {
    const ch = Ekko.Channel({ capacity: 1 });
    await Ekko.spawn(async (ch) => {
      await ch.send("from worker");
    }, [ch]);
    const val = await ch.recv();
    expect(val).toBe("from worker");
  });

  test("parent sends, worker recvs", async () => {
    const ch = Ekko.Channel({ capacity: 1 });
    const resultCh = Ekko.Channel({ capacity: 1 });

    const done = Ekko.spawn(async (ch, resultCh) => {
      const val = await ch.recv();
      await resultCh.send(val);
    }, [ch, resultCh]);

    await ch.send("to worker");
    const result = await resultCh.recv();
    await done;
    expect(result).toBe("to worker");
  });

  test("bidirectional: two channels, parent to worker and back", async () => {
    const toWorker = Ekko.Channel({ capacity: 1 });
    const fromWorker = Ekko.Channel({ capacity: 1 });

    const done = Ekko.spawn(async (toWorker, fromWorker) => {
      const msg = await toWorker.recv();
      await fromWorker.send("echo: " + msg);
    }, [toWorker, fromWorker]);

    await toWorker.send("ping");
    const reply = await fromWorker.recv();
    await done;
    expect(reply).toBe("echo: ping");
  });

  test("multiple workers sending to same channel", async () => {
    const ch = Ekko.Channel({ capacity: 5 });

    await Ekko.spawn(async (ch) => { await ch.send("w1"); }, [ch]);
    await Ekko.spawn(async (ch) => { await ch.send("w2"); }, [ch]);
    await Ekko.spawn(async (ch) => { await ch.send("w3"); }, [ch]);

    const results: string[] = [];
    for (let i = 0; i < 3; i++) {
      results.push(await ch.recv() as string);
    }
    expect(results).toHaveLength(3);
    expect(results).toContain("w1");
    expect(results).toContain("w2");
    expect(results).toContain("w3");
  });

  test("worker sends result via channel instead of return value", async () => {
    const ch = Ekko.Channel({ capacity: 1 });

    await Ekko.spawn(async (ch) => {
      const result = 21 * 2;
      await ch.send(result);
    }, [ch]);

    const val = await ch.recv();
    expect(val).toBe(42);
  });

  test("worker sends multiple messages", async () => {
    const ch = Ekko.Channel({ capacity: 3 });

    await Ekko.spawn(async (ch) => {
      await ch.send("a");
      await ch.send("b");
      await ch.send("c");
    }, [ch]);

    expect(await ch.recv()).toBe("a");
    expect(await ch.recv()).toBe("b");
    expect(await ch.recv()).toBe("c");
  });

  test("worker sends object through channel", async () => {
    const ch = Ekko.Channel({ capacity: 1 });

    await Ekko.spawn(async (ch) => {
      await ch.send({ status: "ok", code: 200 });
    }, [ch]);

    const val = await ch.recv();
    expect(val).toEqual({ status: "ok", code: 200 });
  });

  test("parent sends number, worker doubles it, sends back", async () => {
    const input = Ekko.Channel({ capacity: 1 });
    const output = Ekko.Channel({ capacity: 1 });

    const done = Ekko.spawn(async (input, output) => {
      const n = await input.recv() as number;
      await output.send(n * 2);
    }, [input, output]);

    await input.send(21);
    const result = await output.recv();
    await done;
    expect(result).toBe(42);
  });

  test("channel works across spawn with sleep", async () => {
    const ch = Ekko.Channel({ capacity: 1 });

    await Ekko.spawn(async (ch) => {
      await Ekko.sleep(10);
      await ch.send("delayed");
    }, [ch]);

    const val = await ch.recv();
    expect(val).toBe("delayed");
  });

  test("two workers, each with own output channel", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });

    await Ekko.spawn(async (ch1) => { await ch1.send("from1"); }, [ch1]);
    await Ekko.spawn(async (ch2) => { await ch2.send("from2"); }, [ch2]);

    const v1 = await ch1.recv();
    const v2 = await ch2.recv();
    expect(v1).toBe("from1");
    expect(v2).toBe("from2");
  });
});
