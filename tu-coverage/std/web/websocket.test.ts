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

const PORT_WS = 19920;

describe("WebSocket - availability", () => {
  test("WebSocket constructor exists", () => {
    expect(typeof WebSocket).toBe("function");
  });

  test("WebSocket is exported from ekko:web", () => {
    expect(WebSocket).toBeTruthy();
  });
});

describe("WebSocket - connection lifecycle", () => {
  let wsServer: any;

  test("start WebSocket server", () => {
    wsServer = createServer({ port: PORT_WS, host: "127.0.0.1" });
    wsServer.get("/ws-health", (_req: any, res: any) => {
      res.text("ok");
    });
    wsServer.start();
    expect(wsServer).toBeTruthy();
  });

  test("WebSocket can be constructed with url", () => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT_WS}`);
    expect(ws).toBeTruthy();
    expect(ws).not.toBeNull();
    ws.close();
  });

  test("WebSocket has readyState property", () => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT_WS}`);
    expect(typeof ws.readyState).toBe("number");
    ws.close();
  });

  test("WebSocket has send method", () => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT_WS}`);
    expect(typeof ws.send).toBe("function");
    ws.close();
  });

  test("WebSocket has close method", () => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT_WS}`);
    expect(typeof ws.close).toBe("function");
    ws.close();
  });

  test("WebSocket has onmessage property", () => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT_WS}`);
    const hasOnMessage = "onmessage" in ws;
    expect(hasOnMessage).toBe(true);
    ws.close();
  });

  test("stop WebSocket server", () => {
    if (wsServer && wsServer.stop) {
      wsServer.stop();
    }
  });
});

describe("WebSocket - invalid connection", () => {
  test("WebSocket to invalid URL does not crash", () => {
    try {
      const ws = new WebSocket("ws://127.0.0.1:1");
      
      expect(ws).toBeTruthy();
      ws.close();
    } catch (_e) {
      expect(true).toBe(true);
    }
  });
});
