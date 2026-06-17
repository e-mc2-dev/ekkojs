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
import { createRealtime } from "ekko:web/realtime";

describe("ekko:realtime - channels", () => {
  test("createRealtime returns an object", () => {
    const rt = createRealtime();
    expect(typeof rt).toBe("object");
    expect(rt).not.toBe(null);
  });

  test("rt.channel registers a channel", () => {
    const rt = createRealtime();
    rt.channel("chat", { join() {}, message() {}, leave() {} });
    const ch = rt.getChannel("chat");
    expect(ch).not.toBe(null);
  });

  test("rt.channel returns rt for chaining", () => {
    const rt = createRealtime();
    const result = rt.channel("room", { join() {}, message() {}, leave() {} });
    expect(result).toBe(rt);
  });

  test("channelCount increases after channel registration", () => {
    const rt = createRealtime();
    expect(rt.channelCount()).toBe(0);
    rt.channel("ch1", { join() {}, message() {}, leave() {} });
    expect(rt.channelCount()).toBe(1);
    rt.channel("ch2", { join() {}, message() {}, leave() {} });
    expect(rt.channelCount()).toBe(2);
  });

  test("getChannel returns channel object for registered channel", () => {
    const rt = createRealtime();
    rt.channel("chat", { join() {}, message() {}, leave() {} });
    const ch = rt.getChannel("chat");
    expect(typeof ch).toBe("object");
    expect(ch).not.toBe(null);
  });

  test("getChannel returns null for unknown channel", () => {
    const rt = createRealtime();
    const ch = rt.getChannel("unknown");
    expect(ch).toBe(null);
  });

  test("multiple channels registered", () => {
    const rt = createRealtime();
    rt.channel("alpha", { join() {}, message() {}, leave() {} });
    rt.channel("beta", { join() {}, message() {}, leave() {} });
    rt.channel("gamma", { join() {}, message() {}, leave() {} });
    expect(rt.channelCount()).toBe(3);
    expect(rt.getChannel("alpha")).not.toBe(null);
    expect(rt.getChannel("beta")).not.toBe(null);
    expect(rt.getChannel("gamma")).not.toBe(null);
  });

  test("channel has handlers object", () => {
    const rt = createRealtime();
    const handlers = { join() {}, message() {}, leave() {} };
    rt.channel("test-handlers", handlers);
    const ch = rt.getChannel("test-handlers");
    expect(typeof ch).toBe("object");
  });

  test("socketCount starts at 0", () => {
    const rt = createRealtime();
    expect(rt.socketCount()).toBe(0);
  });

  test("broadcast is a function", () => {
    const rt = createRealtime();
    expect(typeof rt.broadcast).toBe("function");
  });

  test("handleConnection is a function", () => {
    const rt = createRealtime();
    expect(typeof rt.handleConnection).toBe("function");
  });

  test("channel with join handler", () => {
    const rt = createRealtime();
    let joinCalled = false;
    rt.channel("join-test", {
      join(sock: any) { joinCalled = true; },
      message() {},
      leave() {}
    });
    const ch = rt.getChannel("join-test");
    expect(ch).not.toBe(null);
  });

  test("channel with message handler", () => {
    const rt = createRealtime();
    let msgCalled = false;
    rt.channel("msg-test", {
      join() {},
      message(sock: any, data: any) { msgCalled = true; },
      leave() {}
    });
    const ch = rt.getChannel("msg-test");
    expect(ch).not.toBe(null);
  });

  test("channel with leave handler", () => {
    const rt = createRealtime();
    let leftCalled = false;
    rt.channel("leave-test", {
      join() {},
      message() {},
      leave(sock: any) { leftCalled = true; }
    });
    const ch = rt.getChannel("leave-test");
    expect(ch).not.toBe(null);
  });

  test("chaining: rt.channel('a').channel('b')", () => {
    const rt = createRealtime();
    rt.channel("a", { join() {}, message() {}, leave() {} })
      .channel("b", { join() {}, message() {}, leave() {} });
    expect(rt.channelCount()).toBe(2);
    expect(rt.getChannel("a")).not.toBe(null);
    expect(rt.getChannel("b")).not.toBe(null);
  });
});
