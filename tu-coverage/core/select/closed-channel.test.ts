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

describe("Ekko.select - closed channel", () => {
  test("select with one closed channel, other has data", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });
    ch1.close();
    await ch2.send("alive");

    const result = await Ekko.select([ch1, ch2]);
    expect(result).toBeTruthy();
  });

  test("select with all channels closed returns", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });
    ch1.close();
    ch2.close();

    const result = await Ekko.select([ch1, ch2]);
    
    if (result === null || result === undefined) {
      expect(result).toBeFalsy();
    } else {
      expect(result.value).toBeUndefined();
    }
  });

  test("select where non-closed channel has data", async () => {
    const closed = Ekko.Channel({ capacity: 1 });
    const open = Ekko.Channel({ capacity: 1 });
    closed.close();
    await open.send("value");

    const result = await Ekko.select([closed, open]);
    expect(result.value).toBe("value");
  });

  test("closed channel with pending messages still selectable", async () => {
    const ch = Ekko.Channel({ capacity: 2 });
    await ch.send("pending");
    ch.close();

    const result = await Ekko.select([ch]);
    expect(result.value).toBe("pending");
  });

  test("select with mix of closed and empty channels", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });
    const ch3 = Ekko.Channel({ capacity: 1 });
    ch1.close();
    await ch3.send("found");

    const result = await Ekko.select([ch1, ch2, ch3]);
    expect(result.value).toBe("found");
  });

  test("select after close with drained channel", async () => {
    const ch1 = Ekko.Channel({ capacity: 1 });
    const ch2 = Ekko.Channel({ capacity: 1 });
    ch1.close();
    ch2.close();

    const result = await Ekko.select([ch1, ch2]);
    
    if (result === null || result === undefined) {
      expect(result).toBeFalsy();
    } else {
      expect(result.value).toBeUndefined();
    }
  });
});
