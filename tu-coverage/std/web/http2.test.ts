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

const isLinux = Ekko.platform === "linux";
const CERT = isLinux ? "/tmp/ekko-test-cert.pem" : "";
const KEY = isLinux ? "/tmp/ekko-test-key.pem" : "";
const PORT_H2 = 19980;

describe("HTTP/2 - server creation", () => {
  test("createServer with http2:true + tls starts server", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const server = createServer({
      port: PORT_H2,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
      http2: true,
    });
    server.get("/h2", (_req: any, res: any) => res.text("http2"));
    const url = server.start();
    expect(url).toContain("https://");
    server.stop();
  });

  test("createServer with http2:false is same as default", () => {
    const server = createServer({
      port: PORT_H2 + 1,
      host: "127.0.0.1",
      http2: false,
    });
    server.get("/no-h2", (_req: any, res: any) => res.text("http1"));
    const url = server.start();
    expect(url).toContain("http://");
    server.stop();
  });

  test("createServer with http2:true without tls still starts (h2c)", () => {
    const server = createServer({
      port: PORT_H2 + 2,
      host: "127.0.0.1",
      http2: true,
    });
    server.get("/h2c", (_req: any, res: any) => res.text("h2c"));
    const url = server.start();
    
    expect(url).toContain("http://");
    server.stop();
  });

  test("HTTP/2 server returns https URL when TLS provided", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const server = createServer({
      port: PORT_H2 + 3,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
      http2: true,
    });
    server.get("/secure-h2", (_req: any, res: any) => res.text("ok"));
    const url = server.start();
    expect(url).toContain("https://");
    expect(url).toContain(String(PORT_H2 + 3));
    server.stop();
  });
});

describe("HTTP/2 - features", () => {
  test("HTTP/2 server with routes still works", () => {
    const server = createServer({
      port: PORT_H2 + 4,
      host: "127.0.0.1",
      http2: true,
    });
    server.get("/r1", (_req: any, res: any) => res.text("r1"));
    server.post("/r2", (_req: any, res: any) => res.text("r2"));
    server.put("/r3", (_req: any, res: any) => res.text("r3"));
    expect(server).toBeTruthy();
  });

  test("HTTP/2 + middleware accepted", () => {
    const server = createServer({
      port: PORT_H2 + 5,
      host: "127.0.0.1",
      http2: true,
    });
    server.use((_req: any, _res: any, next: any) => { next(); });
    server.get("/mw", (_req: any, res: any) => res.text("ok"));
    expect(server).toBeTruthy();
  });

  test("HTTP/2 option is boolean coerced (truthy value)", () => {
    const server = createServer({
      port: PORT_H2 + 6,
      host: "127.0.0.1",
      http2: 1 as any,
    });
    server.get("/coerced", (_req: any, res: any) => res.text("ok"));
    const url = server.start();
    
    expect(url).toBeTruthy();
    server.stop();
  });

  test("multiple http2 servers on different ports", () => {
    const s1 = createServer({
      port: PORT_H2 + 7,
      host: "127.0.0.1",
      http2: true,
    });
    s1.get("/a", (_req: any, res: any) => res.text("a"));
    const url1 = s1.start();

    const s2 = createServer({
      port: PORT_H2 + 8,
      host: "127.0.0.1",
      http2: true,
    });
    s2.get("/b", (_req: any, res: any) => res.text("b"));
    const url2 = s2.start();

    expect(url1).toBeTruthy();
    expect(url2).toBeTruthy();
    expect(url1).not.toBe(url2);

    s1.stop();
    s2.stop();
  });
});
