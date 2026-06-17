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

describe("Ekko.select - edge cases", () => {
  test("select with single channel", async () => {
    const ch = Ekko.Channel({ capacity: 1 });
    await ch.send("only");
    const result = await Ekko.select([ch]);
    expect(result.value).toBe("only");
  });

  test("select with channel that already has data", async () => {
    const ch = Ekko.Channel({ capacity: 3 });
    await ch.send("ready");
    await ch.send("also");
    const result = await Ekko.select([ch]);
    expect(result.value).toBe("ready");
  });

  test("multiple selects in sequence", async () => {
    const ch = Ekko.Channel({ capacity: 3 });
    await ch.send(1);
    await ch.send(2);
    await ch.send(3);

    const r1 = await Ekko.select([ch]);
    const r2 = await Ekko.select([ch]);
    const r3 = await Ekko.select([ch]);

    expect(r1.value).toBe(1);
    expect(r2.value).toBe(2);
    expect(r3.value).toBe(3);
  });

  test("select in a loop pattern", async () => {
    const ch = Ekko.Channel({ capacity: 5 });
    for (let i = 0; i < 5; i++) {
      await ch.send(i);
    }

    const collected: number[] = [];
    for (let i = 0; i < 5; i++) {
      const result = await Ekko.select([ch]);
      collected.push(result.value as number);
    }
    expect(collected).toEqual([0, 1, 2, 3, 4]);
  });

  test("select from two channels alternately", async () => {
    const ch1 = Ekko.Channel({ capacity: 2 });
    const ch2 = Ekko.Channel({ capacity: 2 });
    await ch1.send("a");
    await ch2.send("b");

    const r1 = await Ekko.select([ch1, ch2]);
    const r2 = await Ekko.select([ch1, ch2]);

    const values = [r1.value, r2.value];
    expect(values).toContain("a");
    expect(values).toContain("b");
  });

  test("select returns object with channel and value", async () => {
    const ch = Ekko.Channel({ capacity: 1 });
    await ch.send("test");
    const result = await Ekko.select([ch]);
    expect(result).toHaveProperty("channel");
    expect(result).toHaveProperty("value");
  });

  test("select channel is 0 for single channel", async () => {
    const ch = Ekko.Channel({ capacity: 1 });
    await ch.send("x");
    const result = await Ekko.select([ch]);
    expect(result.channel).toBe(0);
  });

  test("select with boolean value", async () => {
    const ch = Ekko.Channel({ capacity: 1 });
    await ch.send(true);
    const result = await Ekko.select([ch]);
    expect(result.value).toBe(true);
  });
});
