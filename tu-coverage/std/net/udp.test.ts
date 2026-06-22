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
import { udp } from "ekko:net";

describe("net.udp - createSocket", () => {
  test("udp.createSocket returns a handle number", () => {
    const socket = udp.createSocket(19880);
    expect(typeof socket).toBe("number");
    expect(socket).toBeGreaterThan(0);
    udp.close(socket);
  });

  test("udp.createSocket with port 0 returns handle", () => {
    const socket = udp.createSocket(0);
    expect(typeof socket).toBe("number");
    expect(socket).toBeGreaterThan(0);
    udp.close(socket);
  });
});

describe("net.udp - send", () => {
  test("udp.send to localhost completes without error", () => {
    const sender = udp.createSocket(0);
    const receiver = udp.createSocket(19882);
    udp.send(sender, "hello-udp", "127.0.0.1", 19882);
    udp.close(sender);
    udp.close(receiver);
  });
});

describe("net.udp - recv", () => {
  test("udp.recv receives data sent to socket", async () => {
    const sender = udp.createSocket(0);
    const receiver = udp.createSocket(19884);
    udp.send(sender, "udp-payload", "127.0.0.1", 19884);
    const data = await udp.recv(receiver);
    expect(data).toBeTruthy();
    udp.close(sender);
    udp.close(receiver);
  });
});

describe("net.udp - close", () => {
  test("udp.close closes a socket without error", () => {
    const socket = udp.createSocket(0);
    udp.close(socket);
    expect(true).toBe(true);
  });

  test("udp create + close roundtrip", () => {
    const sock = udp.createSocket(0);
    expect(typeof sock).toBe("number");
    expect(sock).toBeGreaterThan(0);
    udp.close(sock);
  });
});
