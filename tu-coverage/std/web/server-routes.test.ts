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

const PORT_RT = 19960;

describe("server-routes - HTTP methods", () => {
  let server: any;

  test("start route test server", () => {
    server = createServer({ port: PORT_RT, host: "127.0.0.1" });
    server.get("/get-test", (_req: any, res: any) => res.text("get-ok"));
    server.post("/post-test", (req: any, res: any) => res.text("post:" + (req.body || "")));
    server.put("/put-test", (_req: any, res: any) => res.text("put-ok"));
    server.delete("/del-test", (_req: any, res: any) => res.text("del-ok"));
    server.start();
  });

  test("GET route returns correct response", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT}/get-test`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe("get-ok");
  });

  test("POST route receives body", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT}/post-test`, {
      method: "POST",
      body: "hello-post",
    });
    const body = await res.text();
    expect(body).toContain("post:");
    expect(body).toContain("hello-post");
  });

  test("PUT route works", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT}/put-test`, {
      method: "PUT",
      body: "put-data",
    });
    const body = await res.text();
    expect(body).toBe("put-ok");
  });

  test("DELETE route works", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT}/del-test`, {
      method: "DELETE",
    });
    const body = await res.text();
    expect(body).toBe("del-ok");
  });

  test("stop route test server", () => {
    server.stop();
  });
});

describe("server-routes - multiple routes", () => {
  let server: any;

  test("start multi-route server", () => {
    server = createServer({ port: PORT_RT + 1, host: "127.0.0.1" });
    server.get("/alpha", (_req: any, res: any) => res.text("alpha"));
    server.get("/beta", (_req: any, res: any) => res.text("beta"));
    server.post("/gamma", (_req: any, res: any) => res.text("gamma"));
    server.get("/delta", (_req: any, res: any) => res.text("delta"));
    server.start();
  });

  test("multiple routes on same server all respond", async () => {
    const r1 = await fetch(`http://127.0.0.1:${PORT_RT + 1}/alpha`);
    expect(await r1.text()).toBe("alpha");

    const r2 = await fetch(`http://127.0.0.1:${PORT_RT + 1}/beta`);
    expect(await r2.text()).toBe("beta");

    const r3 = await fetch(`http://127.0.0.1:${PORT_RT + 1}/gamma`, { method: "POST" });
    expect(await r3.text()).toBe("gamma");

    const r4 = await fetch(`http://127.0.0.1:${PORT_RT + 1}/delta`);
    expect(await r4.text()).toBe("delta");
  });

  test("route with path parameter-like patterns", () => {
    const s = createServer({ port: PORT_RT + 2, host: "127.0.0.1" });
    s.get("/users/:id", (_req: any, res: any) => res.text("user"));
    s.get("/items/:category/:id", (_req: any, res: any) => res.text("item"));
    expect(s).toBeTruthy();
  });

  test("stop multi-route server", () => {
    server.stop();
  });
});

describe("server-routes - request object", () => {
  let server: any;

  test("start request-inspection server", () => {
    server = createServer({ port: PORT_RT + 3, host: "127.0.0.1" });
    server.get("/inspect", (req: any, res: any) => {
      res.json({
        method: req.method,
        path: req.path,
        headers: req.headers,
        query: req.query,
      });
    });
    server.start();
  });

  test("route handler receives req object with method", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT + 3}/inspect`);
    const data = await res.json();
    expect(data.method).toBe("GET");
  });

  test("route handler receives req object with path", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT + 3}/inspect`);
    const data = await res.json();
    expect(data.path).toContain("/inspect");
  });

  test("route handler receives req object with headers", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT + 3}/inspect`, {
      headers: { "X-Test": "ekko" },
    });
    const data = await res.json();
    expect(data.headers).toBeTruthy();
  });

  test("route handler receives req object with query string", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT + 3}/inspect?foo=bar`);
    const data = await res.json();
    
    const hasQuery = (data.query && JSON.stringify(data.query).includes("foo")) ||
                     (data.path && data.path.includes("foo"));
    expect(hasQuery).toBe(true);
  });

  test("stop request-inspection server", () => {
    server.stop();
  });
});

describe("server-routes - response types", () => {
  let server: any;

  test("start response server", () => {
    server = createServer({ port: PORT_RT + 4, host: "127.0.0.1" });
    server.get("/ok", (_req: any, res: any) => res.status(200).text("ok"));
    server.get("/created", (_req: any, res: any) => res.status(201).text("created"));
    server.get("/not-found", (_req: any, res: any) => res.status(404).text("not found"));
    server.get("/error", (_req: any, res: any) => res.status(500).text("error"));
    server.get("/json-resp", (_req: any, res: any) => res.json({ key: "value" }));
    server.get("/text-resp", (_req: any, res: any) => res.text("plain text"));
    server.get("/html-resp", (_req: any, res: any) => res.html("<h1>Hello</h1>"));
    server.get("/redirect", (_req: any, res: any) => res.redirect("/ok"));
    server.start();
  });

  test("response status code 200", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT + 4}/ok`);
    expect(res.status).toBe(200);
  });

  test("response status code 201", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT + 4}/created`);
    expect(res.status).toBe(201);
  });

  test("response status code 404", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT + 4}/not-found`);
    expect(res.status).toBe(404);
  });

  test("response status code 500", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT + 4}/error`);
    expect(res.status).toBe(500);
  });

  test("response with JSON body", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT + 4}/json-resp`);
    const data = await res.json();
    expect(data.key).toBe("value");
  });

  test("response with text body", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT + 4}/text-resp`);
    const body = await res.text();
    expect(body).toBe("plain text");
  });

  test("response with HTML body", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_RT + 4}/html-resp`);
    const body = await res.text();
    expect(body).toContain("<h1>Hello</h1>");
  });

  test("response redirect", async () => {

    const res = await fetch(`http://127.0.0.1:${PORT_RT + 4}/redirect`);
    const validRedirect = (res.status >= 300 && res.status < 400) || res.status === 200;
    expect(validRedirect).toBe(true);
  });

  test("stop response server", () => {
    server.stop();
  });
});

describe("server-routes - advanced features", () => {
  test("group routes with prefix", () => {
    const server = createServer({ port: PORT_RT + 5, host: "127.0.0.1" });
    server.group("/api", (g: any) => {
      g.get("/users", (_req: any, res: any) => res.json([]));
      g.post("/users", (_req: any, res: any) => res.json({ id: 1 }));
    });
    expect(server).toBeTruthy();
  });

  test("middleware applied to all routes", async () => {
    const server = createServer({ port: PORT_RT + 6, host: "127.0.0.1" });
    let middlewareCalled = false;
    server.use((_req: any, _res: any, next: any) => {
      middlewareCalled = true;
      next();
    });
    server.get("/mw-check", (_req: any, res: any) => res.text("ok"));
    server.start();

    await fetch(`http://127.0.0.1:${PORT_RT + 6}/mw-check`);
    expect(middlewareCalled).toBe(true);
    server.stop();
  });

  test("static method exists", () => {
    const server = createServer();
    expect(typeof server.static).toBe("function");
  });

  test("auth method exists", () => {
    const server = createServer();
    expect(typeof server.auth).toBe("function");
  });

  test("server chaining (get().post().use())", () => {
    const server = createServer();
    const result = server
      .get("/a", (_req: any, res: any) => res.text("a"))
      .post("/b", (_req: any, res: any) => res.text("b"))
      .use((_req: any, _res: any, next: any) => next());
    expect(result).toBeTruthy();
    expect(typeof result.get).toBe("function");
  });
});
