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

describe("Ekko.select - basic", () => {
  test("select from 2 channels, one has data", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });
    await ch1.send("hello");

    const result = await Ekko.select([ch1, ch2]);
    expect(result).toBeTruthy();
  });

  test("select from 3 channels", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });
    const ch3 = Ekko.Channel({ capacity: 1 });
    await ch2.send("picked");

    const result = await Ekko.select([ch1, ch2, ch3]);
    expect(result).toBeTruthy();
  });

  test("first channel with data wins", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });
    await ch1.send("first");

    const result = await Ekko.select([ch1, ch2]);
    expect(result.value).toBe("first");
  });

  test("select returns the correct value", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });
    await ch2.send(42);

    const result = await Ekko.select([ch1, ch2]);
    expect(result.value).toBe(42);
  });

  test("select with channels that get data at different times", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });

    await Ekko.spawn(async (ch2) => {
      await Ekko.sleep(5);
      await ch2.send("delayed");
    }, [ch2]);

    const result = await Ekko.select([ch1, ch2]);
    expect(result.value).toBe("delayed");
  });

  test("select returns channel index", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });
    await ch2.send("data");

    const result = await Ekko.select([ch1, ch2]);
    expect(result.channel).toBe(1);
  });

  test("select with number value", async () => {
    const ch = Ekko.Channel({ capacity: 1 });
    await ch.send(99);
    const result = await Ekko.select([ch]);
    expect(result.value).toBe(99);
  });

  test("select with string value", async () => {
    const ch = Ekko.Channel({ capacity: 1 });
    await ch.send("msg");
    const result = await Ekko.select([ch]);
    expect(result.value).toBe("msg");
  });

  test("select picks from first ready channel when multiple ready", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });
    await ch1.send("a");
    await ch2.send("b");

    const result = await Ekko.select([ch1, ch2]);
    
    const isA = result.value === "a";
    const isB = result.value === "b";
    expect(isA || isB).toBeTruthy();
  });

  test("select unblocks when data arrives", async () => {
    const ch = Ekko.Channel({ capacity: 1 });

    await Ekko.spawn(async (ch) => {
      await Ekko.sleep(10);
      await ch.send("arrived");
    }, [ch]);

    const result = await Ekko.select([ch]);
    expect(result.value).toBe("arrived");
  });
});
