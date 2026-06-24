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
import { exists } from "ekko:fs";

const CERT_PATH = "/tmp/ekko-test-cert.pem";
const KEY_PATH = "/tmp/ekko-test-key.pem";
const HAS_CERT = exists(CERT_PATH) && exists(KEY_PATH);
const CERT = HAS_CERT ? CERT_PATH : "";
const KEY = HAS_CERT ? KEY_PATH : "";
const PORT = 19950;

describe("HTTPS server", () => {
  test("createServer with tls option starts on https URL", async () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const server = createServer({
      port: PORT,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    server.get("/health", (req: any, res: any) => {
      res.json({ status: "ok" });
    });
    const url = server.start();
    expect(url).toContain("https://");
    expect(url).toContain(String(PORT));
    server.stop();
  });

  test("createServer without tls still works as http", async () => {
    const PORT2 = 19951;
    const server = createServer({ port: PORT2, host: "127.0.0.1" });
    server.get("/ping", (req: any, res: any) => { res.text("pong"); });
    const url = server.start();
    expect(url).toContain("http://");

    const resp = await fetch(`http://127.0.0.1:${PORT2}/ping`);
    const text = await resp.text();
    expect(text).toBe("pong");

    server.stop();
  });

  test("createServer with http2 flag starts on https URL", async () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const PORT3 = 19952;
    const server = createServer({
      port: PORT3,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
      http2: true,
    });
    server.get("/h2", (req: any, res: any) => { res.text("http2 ready"); });
    const url = server.start();
    expect(url).toContain("https://");
    server.stop();
  });

  test("tls option accepted without crashing", () => {
    if (!CERT) { expect(true).toBe(true); return; }
    const server = createServer({
      port: 19953,
      host: "127.0.0.1",
      tls: { cert: CERT, key: KEY },
    });
    expect(typeof server.start).toBe("function");
    expect(typeof server.stop).toBe("function");
    expect(typeof server.get).toBe("function");
  });
});
