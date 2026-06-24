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

const PORT = 19871;

describe("WHATWG request body contract", () => {
  let server: any;

  test("start server", () => {
    
    server = createServer({ port: PORT, host: "127.0.0.1", maxBodySize: 1 });

    server.post("/text", async (req: any, res: any) => { res.text(await req.text()); });

    server.post("/json", async (req: any, res: any) => {
      try { const d = await req.json(); res.json({ ok: true, got: d }); }
      catch (_e: any) { res.status(400).json({ error: "bad json" }); }
    });

    server.post("/bytes", async (req: any, res: any) => {
      const b = await req.bytes();
      res.json({ isU8: b instanceof Uint8Array, len: b.length, first: b[0], last: b[b.length - 1] });
    });

    server.post("/twice", async (req: any, res: any) => {
      await req.text();
      let kind = "none";
      try { await req.text(); } catch (e: any) { kind = (e instanceof TypeError) ? "TypeError" : "other"; }
      res.json({ secondRead: kind, bodyUsed: req.bodyUsed });
    });

    server.post("/stream", async (req: any, res: any) => {
      const b = req.body;
      res.json({ isStream: !!b && typeof b.getReader === "function" });
    });

    server.get("/nobody", async (req: any, res: any) => {
      res.json({ bodyNull: req.body === null });
    });

    server.post("/stream-read", async (req: any, res: any) => {
      
      const reader = req.body.getReader();
      let total = 0, chunks = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; total += value.length; chunks++; }
      res.json({ total, chunks });
    });

    server.start();
    expect(server).toBeTruthy();
  });

  test("await req.text() returns the UTF-8 body", async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/text`, { method: "POST", body: "hello body" });
    expect(await r.text()).toBe("hello body");
  });

  test("multibyte text round-trips intact (base64 transport is binary-safe)", async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/text`, { method: "POST", body: "ünïcödé ✓ 日本語" });
    expect(await r.text()).toBe("ünïcödé ✓ 日本語");
  });

  test("await req.json() parses a JSON body, content-type-independent", async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/json`, { method: "POST", body: JSON.stringify({ a: 1, b: "x" }) });
    const out = await r.json();
    expect(out.ok).toBe(true);
    expect(out.got.a).toBe(1);
    expect(out.got.b).toBe("x");
  });

  test("await req.json() rejects on invalid JSON (handler catches -> 400)", async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/json`, { method: "POST", body: "{not valid json" });
    expect(r.status).toBe(400);
  });

  test("await req.bytes() returns the exact body bytes as a Uint8Array", async () => {
    
    const r = await fetch(`http://127.0.0.1:${PORT}/bytes`, { method: "POST", body: "abc" });
    const out = await r.json();
    expect(out.isU8).toBe(true);
    expect(out.len).toBe(3);
    expect(out.first).toBe(97);
    expect(out.last).toBe(99);
  });

  test("body is single-use: a second read rejects with TypeError, bodyUsed is true", async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/twice`, { method: "POST", body: "once" });
    const out = await r.json();
    expect(out.secondRead).toBe("TypeError");
    expect(out.bodyUsed).toBe(true);
  });

  test("req.body is a ReadableStream when a body is present", async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/stream`, { method: "POST", body: "x" });
    expect((await r.json()).isStream).toBe(true);
  });

  test("req.body is null when there is no body", async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/nobody`);
    expect((await r.json()).bodyNull).toBe(true);
  });

  test("req.body streams in multiple chunks via getReader (true streaming, not buffered)", async () => {
    const big = "y".repeat(200 * 1024); 
    const r = await fetch(`http://127.0.0.1:${PORT}/stream-read`, { method: "POST", body: big });
    const out = await r.json();
    expect(out.total).toBe(200 * 1024);
    expect(out.chunks > 1).toBe(true); 
  });

  test("a body over maxBodySize is rejected (413 or connection reset)", async () => {

    
    
    const big = "x".repeat(2 * 1024 * 1024); 
    let status = 0;
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/text`, { method: "POST", body: big });
      status = r.status;
    } catch (_e) {
      status = -1; 
    }
    expect(status === 413 || status === -1).toBe(true);
    expect(status).not.toBe(200);
  });

  test("stop server", () => {
    server.stop();
    expect(true).toBe(true);
  });
});
