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
import { createServer, WebSocket } from "ekko:web";

describe("WebSocket basics - existence", () => {
  test("WebSocket is exported from ekko:web", () => {
    expect(WebSocket).toBeTruthy();
  });

  test("typeof WebSocket is function", () => {
    expect(typeof WebSocket).toBe("function");
  });

  test("WebSocket constructor exists", () => {
    expect(WebSocket).toBeTruthy();
    expect(typeof WebSocket).toBe("function");
  });
});

describe("WebSocket basics - server integration", () => {
  test("server has ws method", () => {
    const server = createServer();
    expect(typeof server.ws).toBe("function");
  });

  test("server ws route registered", () => {
    const server = createServer();
    server.ws("/chat", (sock: any) => {
      sock.on("message", (msg: any) => {
        sock.send("echo:" + msg);
      });
    });
    expect(server).toBeTruthy();
  });

  test("createServer has ws method", () => {
    const server = createServer({ port: 19990, host: "127.0.0.1" });
    expect(typeof server.ws).toBe("function");
  });

  test("ws() returns server (chaining)", () => {
    const server = createServer();
    const result = server.ws("/ws-chain", (_sock: any) => {});
    expect(result).toBeTruthy();
    expect(typeof result.get).toBe("function");
    expect(typeof result.ws).toBe("function");
  });
});
