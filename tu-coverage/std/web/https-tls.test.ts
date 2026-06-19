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
const PORT_TLS = 19940;

describe("HTTPS/TLS - createServer with TLS options", () => {
  test("createServer with tls.cert + tls.key returns https URL", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const server = createServer({
      port: PORT_TLS,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    server.get("/health", (_req: any, res: any) => res.text("ok"));
    const url = server.start();
    expect(url).toContain("https://");
    server.stop();
  });

  test("HTTPS URL contains correct port", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const port = PORT_TLS + 1;
    const server = createServer({
      port,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    server.get("/p", (_req: any, res: any) => res.text("ok"));
    const url = server.start();
    expect(url).toContain(String(port));
    server.stop();
  });

  test("HTTPS URL contains correct host", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const server = createServer({
      port: PORT_TLS + 2,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    server.get("/h", (_req: any, res: any) => res.text("ok"));
    const url = server.start();
    expect(url).toContain("127.0.0.1");
    server.stop();
  });

  test("plain createServer without tls returns http URL", () => {
    const server = createServer({ port: PORT_TLS + 3, host: "127.0.0.1" });
    server.get("/plain", (_req: any, res: any) => res.text("ok"));
    const url = server.start();
    expect(url).toContain("http://");
    expect(url).not.toContain("https://");
    server.stop();
  });

  test("createServer with tls + http2 returns https URL", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const server = createServer({
      port: PORT_TLS + 4,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
      http2: true,
    });
    server.get("/h2", (_req: any, res: any) => res.text("ok"));
    const url = server.start();
    expect(url).toContain("https://");
    server.stop();
  });

  test("createServer with http2:true but no tls returns http URL", () => {
    const server = createServer({
      port: PORT_TLS + 5,
      host: "127.0.0.1",
      http2: true,
    });
    server.get("/h2c", (_req: any, res: any) => res.text("ok"));
    const url = server.start();
    expect(url).toContain("http://");
    server.stop();
  });
});

describe("HTTPS/TLS - server methods with TLS", () => {
  test("server with TLS has all route methods (get, post, put, delete)", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const server = createServer({
      port: PORT_TLS + 6,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    expect(typeof server.get).toBe("function");
    expect(typeof server.post).toBe("function");
    expect(typeof server.put).toBe("function");
    expect(typeof server.delete).toBe("function");
  });

  test("server with TLS has start/stop methods", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const server = createServer({
      port: PORT_TLS + 7,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    expect(typeof server.start).toBe("function");
    expect(typeof server.stop).toBe("function");
  });

  test("server with TLS has ws method", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const server = createServer({
      port: PORT_TLS + 8,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    expect(typeof server.ws).toBe("function");
  });

  test("server with TLS has use method for middleware", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const server = createServer({
      port: PORT_TLS + 9,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    expect(typeof server.use).toBe("function");
  });
});

describe("HTTPS/TLS - multiple servers and lifecycle", () => {
  test("multiple HTTPS servers on different ports", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const s1 = createServer({
      port: PORT_TLS + 10,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    s1.get("/a", (_req: any, res: any) => res.text("a"));
    const url1 = s1.start();
    expect(url1).toContain("https://");

    const s2 = createServer({
      port: PORT_TLS + 11,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    s2.get("/b", (_req: any, res: any) => res.text("b"));
    const url2 = s2.start();
    expect(url2).toContain("https://");

    expect(url1).not.toBe(url2);
    s1.stop();
    s2.stop();
  });

  test("stop HTTPS server then start new one on same port", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const port = PORT_TLS + 12;
    const s1 = createServer({
      port,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    s1.get("/first", (_req: any, res: any) => res.text("first"));
    s1.start();
    s1.stop();

    const s2 = createServer({
      port,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    s2.get("/second", (_req: any, res: any) => res.text("second"));
    const url2 = s2.start();
    expect(url2).toContain("https://");
    expect(url2).toContain(String(port));
    s2.stop();
  });

  test("TLS options with empty strings treated as no-TLS", () => {
    const server = createServer({
      port: PORT_TLS + 13,
      host: "127.0.0.1",
      tls: { cert: "", key: "" },
    });
    server.get("/empty", (_req: any, res: any) => res.text("ok"));
    const url = server.start();
    expect(url).toContain("http://");
    expect(url).not.toContain("https://");
    server.stop();
  });

  test("createServer with only tls.cert (no key) — should still try", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    let created = false;
    try {
      const server = createServer({
        port: PORT_TLS + 14,
        host: "127.0.0.1",
        tls: { cert: CERT, key: "" },
      });
      created = true;
      
      expect(typeof server.start).toBe("function");
    } catch {
      
      created = false;
    }
    expect(created).toBe(true);
  });

  test("createServer with tls.pfx option format accepted", () => {
    const server = createServer({
      port: PORT_TLS + 15,
      host: "127.0.0.1",
      tls: { pfx: "/tmp/nonexistent.pfx", password: "pass" },
    });
    
    expect(server).toBeTruthy();
    expect(typeof server.start).toBe("function");
    expect(typeof server.stop).toBe("function");
  });
});
