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

describe("Ekko.Channel - close", () => {
  test("close marks channel closed", () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    ch.close();
    
    expect(ch.trySend("msg")).toBeFalsy();
  });

  test("recv after close with no messages returns undefined", async () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    ch.close();
    const val = ch.tryRecv();
    expect(val).toBeUndefined();
  });

  test("send after close is rejected", () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    ch.close();
    const result = ch.trySend("data");
    expect(result).toBeFalsy();
  });

  test("close with pending messages — can still drain", async () => {
    const ch = new Ekko.Channel({ capacity: 3 });
    await ch.send("a");
    await ch.send("b");
    ch.close();

    expect(ch.tryRecv()).toBe("a");
    expect(ch.tryRecv()).toBe("b");
  });

  test("double close is safe", () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    ch.close();
    
    let threw = false;
    try {
      ch.close();
    } catch (_) {
      threw = true;
    }
    expect(threw).toBeFalsy();
  });

  test("tryRecv returns undefined after drain on closed channel", async () => {
    const ch = new Ekko.Channel({ capacity: 2 });
    await ch.send("only");
    ch.close();
    expect(ch.tryRecv()).toBe("only");
    expect(ch.tryRecv()).toBeUndefined();
  });
});
