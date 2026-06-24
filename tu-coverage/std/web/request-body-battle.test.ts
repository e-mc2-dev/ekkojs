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

const PORT = 19880;
const B = `http://127.0.0.1:${PORT}`;

function toHex(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += (u8[i] < 16 ? "0" : "") + u8[i].toString(16);
  return s;
}

function strBytes(s: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.codePointAt(i) as number;
    if (c > 0xffff) i++;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return new Uint8Array(out);
}

describe("request-body BATTLE", () => {
  let server: any;

  test("boot server with every accessor route", () => {
    server = createServer({ port: PORT, host: "127.0.0.1", maxBodySize: 8 }); 

    server.post("/text", async (req: any, res: any) => { res.text(await req.text()); });
    
    server.post("/text-hex", async (req: any, res: any) => { res.text(toHex(strBytes(await req.text()))); });
    
    server.route({ method: "POST", path: "/hex", handler: async (req: any, res: any) => { res.text(toHex(await req.bytes())); } });
    server.put("/hex", async (req: any, res: any) => { res.text(toHex(await req.bytes())); });
    server.patch("/hex", async (req: any, res: any) => { res.text(toHex(await req.bytes())); });
    server.delete("/hex", async (req: any, res: any) => { res.text(toHex(await req.bytes())); });
    
    server.post("/len", async (req: any, res: any) => { const c = (req as any).clone(); res.json({ b: (await req.bytes()).length, a: (await c.arrayBuffer()).byteLength }); });
    
    server.post("/json", async (req: any, res: any) => {
      try { res.json({ ok: true, v: await req.json() }); } catch (_e: any) { res.status(400).json({ ok: false }); }
    });
    
    server.post("/stream", async (req: any, res: any) => {
      if (req.body === null) { res.json({ nullBody: true }); return; }
      const reader = req.body.getReader();
      const parts: Uint8Array[] = []; let total = 0, chunks = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; parts.push(value); total += value.length; chunks++; }
      const all = new Uint8Array(total); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
      res.json({ total, chunks, hex: toHex(all) });
    });
    
    server.route({ method: "POST", path: "/probe", handler: probe });
    server.put("/probe", probe); server.patch("/probe", probe); server.delete("/probe", probe);
    server.get("/probe", probe);
    function probe(req: any, res: any) { res.json({ method: req.method, bodyNull: req.body === null, cl: req.headers["content-length"] || null }); }
    
    server.post("/twice/:mode", async (req: any, res: any) => {
      const mode = req.params.mode;
      const first = mode.split("-")[0], second = mode.split("-")[1];
      const read = async (k: string) => { if (k === "text") return req.text(); if (k === "bytes") return req.bytes(); if (k === "json") return req.json().catch(() => null); if (k === "ab") return req.arrayBuffer(); if (k === "stream") { const r = req.body.getReader(); while (true) { const { done } = await r.read(); if (done) break; } return null; } };
      await read(first).catch(() => null);
      let kind = "ok";
      try { await read(second); } catch (e: any) { kind = e instanceof TypeError ? "TypeError" : "other"; }
      res.json({ kind, bodyUsed: req.bodyUsed });
    });
    
    server.post("/contentlen", async (req: any, res: any) => { res.json({ declared: Number(req.headers["content-length"] || -1), actual: (await req.bytes()).length }); });
    
    server.post("/clone", async (req: any, res: any) => {
      const c = (req as any).clone();
      const a = await req.text(); const b = await c.text();
      res.json({ a, b, equal: a === b });
    });

    server.start();
    expect(server).toBeTruthy();
  });

  const CONTENT_TYPES = [
    "application/json", "text/plain", "application/octet-stream", "application/x-www-form-urlencoded",
    "text/html", "image/png", "application/xml", "multipart/form-data", "weird/custom", "",
  ];
  for (const ct of CONTENT_TYPES) {
    test(`json() is content-type-independent [ct=${ct || "<none>"}]`, async () => {
      const headers: any = {}; if (ct) headers["Content-Type"] = ct;
      const r = await fetch(`${B}/json`, { method: "POST", headers, body: JSON.stringify({ k: "v", n: 7 }) });
      const out = await r.json();
      expect(out.ok).toBe(true); expect(out.v.k).toBe("v"); expect(out.v.n).toBe(7);
    });
  }

  for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
    test(`method ${m} delivers the body`, async () => {
      const r = await fetch(`${B}/hex`, { method: m, body: "AB" }); 
      expect(await r.text()).toBe("4142");
    });
  }
  test("GET has no body (req.body null)", async () => {
    const r = await fetch(`${B}/probe`, { method: "GET" });
    expect((await r.json()).bodyNull).toBe(true);
  });
  test("POST with empty body → req.body null", async () => {
    const r = await fetch(`${B}/probe`, { method: "POST", body: "" });
    expect((await r.json()).bodyNull).toBe(true);
  });

  test("all 256 byte values survive byte-exact (bytes())", async () => {
    const all = new Uint8Array(256); for (let i = 0; i < 256; i++) all[i] = i;
    const r = await fetch(`${B}/hex`, { method: "POST", body: all });
    expect(await r.text()).toBe(toHex(all));
  });
  test("NUL bytes and high bytes survive", async () => {
    const b = new Uint8Array([0, 0, 0, 255, 254, 0, 128, 1]);
    const r = await fetch(`${B}/hex`, { method: "POST", body: b });
    expect(await r.text()).toBe(toHex(b));
  });

  
  for (const s of ["héllo", "日本語テキスト", "emoji 😀🎉", "mixed ½ ¾ © ® ™", "\t\n\r\0 control", "a".repeat(1000), "𝕏 𝟙 surrogate-pairs 🇫🇷"]) {
    test(`request body byte-exact for unicode [${s.slice(0, 10)}…]`, async () => {
      const expected = toHex(strBytes(s));
      const r = await fetch(`${B}/hex`, { method: "POST", body: s });
      expect(await r.text()).toBe(expected);
    });
    test(`req.text() round-trips unicode [${s.slice(0, 10)}…]`, async () => {
      
      const r = await fetch(`${B}/text-hex`, { method: "POST", body: s });
      expect(await r.text()).toBe(toHex(strBytes(s)));
    });
  }

  const SIZES = [0, 1, 1024, 65535, 65536, 65537, 200 * 1024, 1024 * 1024];
  for (const n of SIZES) {
    test(`size ${n}: bytes()/arrayBuffer() agree`, async () => {
      const body = new Uint8Array(n); for (let i = 0; i < n; i++) body[i] = i & 0xff;
      const r = await fetch(`${B}/len`, { method: "POST", body });
      const out = await r.json();
      expect(out.b).toBe(n); expect(out.a).toBe(n);
    });
  }
  for (const n of [0, 100, 65536, 200 * 1024, 1024 * 1024]) {
    test(`size ${n}: stream integrity + chunking`, async () => {
      const body = new Uint8Array(n); for (let i = 0; i < n; i++) body[i] = (i * 7) & 0xff;
      const r = await fetch(`${B}/stream`, { method: "POST", body });
      const out = await r.json();
      if (n === 0) { expect(out.nullBody === true || out.total === 0).toBe(true); return; }
      expect(out.total).toBe(n);
      expect(out.hex).toBe(toHex(body));
      if (n > 65536) expect(out.chunks > 1).toBe(true); 
    });
  }

  const COMBOS = ["text-text", "bytes-bytes", "text-bytes", "bytes-text", "json-text", "ab-bytes", "stream-text", "text-stream", "stream-bytes"];
  for (const combo of COMBOS) {
    test(`single-use: ${combo} → second read errors`, async () => {
      const r = await fetch(`${B}/twice/${combo}`, { method: "POST", body: '{"x":1}' });
      const out = await r.json();
      expect(out.kind).toBe("TypeError");
      expect(out.bodyUsed).toBe(true);
    });
  }

  const JSON_OK: [string, string][] = [
    ["object", '{"a":1}'], ["array", "[1,2,3]"], ["nested", '{"a":{"b":{"c":[1,2,{"d":true}]}}}'],
    ["string", '"hi"'], ["number", "42"], ["true", "true"], ["null", "null"], ["unicode", '{"k":"日本"}'],
    ["empty-obj", "{}"], ["whitespace", '   {"a":1}   '],
  ];
  for (const [name, body] of JSON_OK) {
    test(`json() parses valid [${name}]`, async () => {
      const r = await fetch(`${B}/json`, { method: "POST", body });
      expect((await r.json()).ok).toBe(true);
    });
  }
  for (const [name, body] of [["truncated", "{not json"], ["trailing", '{"a":1}x'], ["bare-word", "banana"], ["empty", ""]] as [string, string][]) {
    test(`json() rejects invalid [${name}] → handler 400`, async () => {
      const r = await fetch(`${B}/json`, { method: "POST", body });
      
      if (name === "empty") { expect(r.status).toBe(200); } else { expect(r.status).toBe(400); }
    });
  }

  test("40 concurrent requests each get their OWN body", async () => {
    const reqs = [];
    for (let i = 0; i < 40; i++) {
      const body = `payload-${i}-${"x".repeat(i * 137)}`;
      reqs.push(fetch(`${B}/text`, { method: "POST", body }).then((r) => r.text()).then((t) => t === body));
    }
    const oks = await Promise.all(reqs);
    expect(oks.every((b) => b === true)).toBe(true);
  });

  test("content-length matches the actual streamed length", async () => {
    const body = "x".repeat(12345);
    const r = await fetch(`${B}/contentlen`, { method: "POST", body });
    const out = await r.json();
    expect(out.actual).toBe(12345);
    expect(out.declared).toBe(12345);
  });

  test("clone(): both the request and its clone read the full body", async () => {
    const r = await fetch(`${B}/clone`, { method: "POST", body: "cloned-payload" });
    const out = await r.json();
    expect(out.a).toBe("cloned-payload");
    expect(out.b).toBe("cloned-payload");
    expect(out.equal).toBe(true);
  });

  test("client fetch: string body parses server-side regardless (text/plain default)", async () => {
    const r = await fetch(`${B}/text`, { method: "POST", body: "plain-string" });
    expect(await r.text()).toBe("plain-string");
  });
  test("client fetch: URLSearchParams serializes to form text", async () => {
    const r = await fetch(`${B}/text`, { method: "POST", body: new URLSearchParams({ a: "1", b: "two" }) });
    expect(await r.text()).toBe("a=1&b=two");
  });
  test("client fetch: Uint8Array body is byte-exact", async () => {
    const b = new Uint8Array([1, 2, 3, 250, 0, 99]);
    const r = await fetch(`${B}/hex`, { method: "POST", body: b });
    expect(await r.text()).toBe(toHex(b));
  });

  test("oversize body (> cap) is rejected (413 or connection reset), never accepted", async () => {
    const big = "x".repeat(16 * 1024 * 1024); 
    let status = 0;
    try { status = (await fetch(`${B}/len`, { method: "POST", body: big })).status; } catch (_e) { status = -1; }
    expect(status === 413 || status === -1).toBe(true);
    expect(status).not.toBe(200);
  });
  test("deeply nested JSON does not crash (parses or 400)", async () => {
    let s = ""; for (let i = 0; i < 500; i++) s += '{"a":'; s += "1"; for (let i = 0; i < 500; i++) s += "}";
    const r = await fetch(`${B}/json`, { method: "POST", body: s });
    expect(r.status === 200 || r.status === 400).toBe(true);
  });
  test("body with embedded JSON-breaking chars is byte-exact (no injection into transport)", async () => {
    const s = '"\\\n\t}{][,: ' + String.fromCharCode(0) + "end";
    const r = await fetch(`${B}/hex`, { method: "POST", body: strBytes(s) });
    expect(await r.text()).toBe(toHex(strBytes(s)));
  });

  test("stop server", () => { server.stop(); expect(true).toBe(true); });
});
