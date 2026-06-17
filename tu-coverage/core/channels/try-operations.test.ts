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

describe("Ekko.Channel - try operations", () => {
  test("trySend when channel has space succeeds", () => {
    const ch = new Ekko.Channel({ capacity: 2 });
    const result = ch.trySend("msg");
    expect(result).toBeTruthy();
  });

  test("trySend when channel is full fails", () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    ch.trySend("first");
    const result = ch.trySend("second");
    expect(result).toBeFalsy();
  });

  test("tryRecv when message available returns value", () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    ch.trySend("data");
    const val = ch.tryRecv();
    expect(val).toBe("data");
  });

  test("tryRecv when channel empty returns undefined", () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    const val = ch.tryRecv();
    expect(val).toBeUndefined();
  });

  test("fill channel to capacity, verify trySend fails", () => {
    const ch = new Ekko.Channel({ capacity: 3 });
    expect(ch.trySend(1)).toBeTruthy();
    expect(ch.trySend(2)).toBeTruthy();
    expect(ch.trySend(3)).toBeTruthy();
    expect(ch.trySend(4)).toBeFalsy();
  });

  test("recv one, trySend succeeds again", () => {
    const ch = new Ekko.Channel({ capacity: 1 });
    ch.trySend("a");
    expect(ch.trySend("b")).toBeFalsy();
    ch.tryRecv();
    expect(ch.trySend("c")).toBeTruthy();
  });

  test("trySend and tryRecv with numbers", () => {
    const ch = new Ekko.Channel({ capacity: 2 });
    ch.trySend(10);
    ch.trySend(20);
    expect(ch.tryRecv()).toBe(10);
    expect(ch.tryRecv()).toBe(20);
  });

  test("tryRecv after all messages consumed returns undefined", () => {
    const ch = new Ekko.Channel({ capacity: 2 });
    ch.trySend("x");
    ch.tryRecv();
    const val = ch.tryRecv();
    expect(val).toBeUndefined();
  });
});
