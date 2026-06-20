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
import { createServer } from "ekko:web";

const PORT_SERVER_BASE = 19910;

describe("web.createServer - basics", () => {
  test("createServer returns a server object", () => {
    const server = createServer();
    expect(server).toBeTruthy();
    expect(server).not.toBeNull();
    expect(server).not.toBeUndefined();
  });

  test("server has start method", () => {
    const server = createServer();
    expect(typeof server.start).toBe("function");
  });

  test("server has get method", () => {
    const server = createServer();
    expect(typeof server.get).toBe("function");
  });

  test("server has stop method", () => {
    const server = createServer();
    expect(typeof server.stop).toBe("function");
  });
});

describe("web.createServer - routes", () => {
  test("can add GET route", () => {
    const server = createServer();
    server.get("/hello", (_req: any, res: any) => {
      res.text("hello");
    });
    expect(server).toBeTruthy();
  });

  test("can add POST route", () => {
    const server = createServer();
    server.post("/submit", (_req: any, res: any) => {
      res.text("ok");
    });
    expect(server).toBeTruthy();
  });

  test("can add multiple routes on same server", () => {
    const server = createServer();
    server.get("/a", (_req: any, res: any) => res.text("a"));
    server.get("/b", (_req: any, res: any) => res.text("b"));
    server.post("/c", (_req: any, res: any) => res.text("c"));
    expect(server).toBeTruthy();
  });
});

describe("web.createServer - start and respond", () => {
  let server: any;

  test("server starts on a port", () => {
    server = createServer({ port: PORT_SERVER_BASE, host: "127.0.0.1" });
    server.get("/ping", (_req: any, res: any) => {
      res.text("pong");
    });
    server.start();
    expect(server).toBeTruthy();
  });

  test("server responds to GET request", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SERVER_BASE}/ping`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe("pong");
  });

  test("server returns 404 for unknown route", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SERVER_BASE}/unknown`);
    expect(res.status).toBe(404);
  });

  test("stop server cleans up", () => {
    server.stop();
  });
});

describe("web.createServer - POST handling", () => {
  let server: any;

  test("start POST server", () => {
    server = createServer({ port: PORT_SERVER_BASE + 1, host: "127.0.0.1" });
    server.post("/data", (req: any, res: any) => {
      res.text("received:" + (req.body || ""));
    });
    server.start();
  });

  test("POST request body is received by handler", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SERVER_BASE + 1}/data`, {
      method: "POST",
      body: "test-payload",
    });
    const body = await res.text();
    expect(body).toContain("received:");
    expect(body).toContain("test-payload");
  });

  test("stop POST server", () => {
    server.stop();
  });
});
