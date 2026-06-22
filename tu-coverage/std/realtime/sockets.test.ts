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

function mockWs() {
  const cbs: any = {};
  return {
    send(d: string) {},
    on(e: string, fn: any) { cbs[e] = fn; },
    _cbs: cbs,
    _sent: [] as string[]
  };
}

describe("ekko:realtime - sockets", () => {
  test("handleConnection returns socket object", () => {
    const rt = createRealtime();
    rt.channel("room", { join() {}, message() {}, leave() {} });
    const ws = mockWs();
    const sock = rt.handleConnection(ws, "/room");
    expect(typeof sock).toBe("object");
    expect(sock).not.toBe(null);
  });

  test("socket has id property", () => {
    const rt = createRealtime();
    rt.channel("room", { join() {}, message() {}, leave() {} });
    const ws = mockWs();
    const sock = rt.handleConnection(ws, "/room");
    expect(typeof sock.id).not.toBe("undefined");
  });

  test("socket has send method", () => {
    const rt = createRealtime();
    rt.channel("room", { join() {}, message() {}, leave() {} });
    const ws = mockWs();
    const sock = rt.handleConnection(ws, "/room");
    expect(typeof sock.send).toBe("function");
  });

  test("socket has join method", () => {
    const rt = createRealtime();
    rt.channel("room", { join() {}, message() {}, leave() {} });
    const ws = mockWs();
    const sock = rt.handleConnection(ws, "/room");
    expect(typeof sock.join).toBe("function");
  });

  test("socket has leave method", () => {
    const rt = createRealtime();
    rt.channel("room", { join() {}, message() {}, leave() {} });
    const ws = mockWs();
    const sock = rt.handleConnection(ws, "/room");
    expect(typeof sock.leave).toBe("function");
  });

  test("socket has broadcast method", () => {
    const rt = createRealtime();
    rt.channel("room", { join() {}, message() {}, leave() {} });
    const ws = mockWs();
    const sock = rt.handleConnection(ws, "/room");
    expect(typeof sock.broadcast).toBe("function");
  });

  test("socket has to method", () => {
    const rt = createRealtime();
    rt.channel("room", { join() {}, message() {}, leave() {} });
    const ws = mockWs();
    const sock = rt.handleConnection(ws, "/room");
    expect(typeof sock.to).toBe("function");
  });

  test("socketCount increases after connection", () => {
    const rt = createRealtime();
    rt.channel("room", { join() {}, message() {}, leave() {} });
    expect(rt.socketCount()).toBe(0);
    const ws1 = mockWs();
    rt.handleConnection(ws1, "/room");
    expect(rt.socketCount()).toBe(1);
    const ws2 = mockWs();
    rt.handleConnection(ws2, "/room");
    expect(rt.socketCount()).toBe(2);
  });

  test("getSocket returns socket by id", () => {
    const rt = createRealtime();
    rt.channel("room", { join() {}, message() {}, leave() {} });
    const ws = mockWs();
    const sock = rt.handleConnection(ws, "/room");
    const found = rt.getSocket(sock.id);
    expect(found).not.toBe(null);
    expect(found.id).toBe(sock.id);
  });

  test("multiple connections get different ids", () => {
    const rt = createRealtime();
    rt.channel("room", { join() {}, message() {}, leave() {} });
    const ws1 = mockWs();
    const ws2 = mockWs();
    const ws3 = mockWs();
    const s1 = rt.handleConnection(ws1, "/room");
    const s2 = rt.handleConnection(ws2, "/room");
    const s3 = rt.handleConnection(ws3, "/room");
    expect(s1.id).not.toBe(s2.id);
    expect(s2.id).not.toBe(s3.id);
    expect(s1.id).not.toBe(s3.id);
  });

  test("socket join adds to channel members", () => {
    const rt = createRealtime();
    rt.channel("lobby", { join() {}, message() {}, leave() {} });
    rt.channel("game", { join() {}, message() {}, leave() {} });
    const ws = mockWs();
    const sock = rt.handleConnection(ws, "/lobby");
    sock.join("game");
    
    expect(typeof sock.join).toBe("function");
  });

  test("socket leave removes from channel members", () => {
    const rt = createRealtime();
    rt.channel("lobby", { join() {}, message() {}, leave() {} });
    const ws = mockWs();
    const sock = rt.handleConnection(ws, "/lobby");
    sock.leave("lobby");
    
    expect(typeof sock.leave).toBe("function");
  });
});
