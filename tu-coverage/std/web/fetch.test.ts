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

const PORT_FETCH = 19900;

describe("fetch - global availability", () => {
  test("fetch is a global function", () => {
    expect(typeof fetch).toBe("function");
  });

  test("fetch exists on globalThis", () => {
    expect(globalThis.fetch).toBeTruthy();
    expect(typeof globalThis.fetch).toBe("function");
  });
});

describe("fetch - invalid input", () => {
  test("fetch with invalid URL rejects", async () => {
    let threw = false;
    try {
      await fetch("not-a-valid-url://%%%");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("fetch with empty string rejects", async () => {
    let threw = false;
    try {
      await fetch("");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe("fetch - with local server", () => {
  let server: any;

  test("start test server", () => {
    server = createServer({ port: PORT_FETCH, host: "127.0.0.1" });
    server.get("/test", (_req: any, res: any) => {
      res.text("hello from ekko");
    });
    server.get("/json", (_req: any, res: any) => {
      res.json({ key: "value", num: 42 });
    });
    server.post("/echo", async (req: any, res: any) => {
      res.text(await req.text());
    });
    server.get("/headers-echo", (req: any, res: any) => {
      res.json(req.headers || {});
    });
    server.start();
  });

  test("GET request returns correct body", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_FETCH}/test`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe("hello from ekko");
  });

  test("response has status property", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_FETCH}/test`);
    expect(res.status).toBe(200);
  });

  test("response has ok property", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_FETCH}/test`);
    expect(res.ok).toBe(true);
  });

  test("POST request sends and receives body", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_FETCH}/echo`, {
      method: "POST",
      body: "posted-data",
    });
    const body = await res.text();
    expect(body).toContain("posted-data");
  });

  test("JSON response can be parsed", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_FETCH}/json`);
    const data = await res.json();
    expect(data.key).toBe("value");
    expect(data.num).toBe(42);
  });

  test("404 for non-existent route", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_FETCH}/does-not-exist`);
    expect(res.status).toBe(404);
  });

  test("custom headers are sent", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_FETCH}/headers-echo`, {
      headers: { "X-Custom-Header": "ekko-test" },
    });
    const data = await res.json();
    const headerStr = JSON.stringify(data).toLowerCase();
    expect(headerStr).toContain("x-custom-header");
  });

  test("stop test server", () => {
    if (server && server.stop) {
      server.stop();
    }
  });
});
