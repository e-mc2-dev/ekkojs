// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(function(ops) {
  var fetchImpl = async function(url, opts) {
    var raw = await ops.raw(url, opts);
    var meta = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      status: meta.status,
      statusText: meta.statusText,
      ok: meta.ok,
      headers: meta.headers || {},
      _handle: meta._handle,
      async text() { return await ops.bodyText(this._handle); },
      async json() { var t = await ops.bodyText(this._handle); return JSON.parse(t); },
      async bytes() { return new Uint8Array(await ops.bodyBytes(this._handle)); },
      async arrayBuffer() { var b = await ops.bodyBytes(this._handle); return new Uint8Array(b).buffer; },
      dispose() { ops.dispose(this._handle); }
    };
  };
  Object.defineProperty(globalThis, 'fetch', { value: fetchImpl, writable: false, configurable: false });
})
