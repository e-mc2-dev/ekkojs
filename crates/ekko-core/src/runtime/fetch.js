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

  
  
  function hasContentType(headers) {
    if (!headers) return false;
    for (var k in headers) { if (Object.prototype.hasOwnProperty.call(headers, k) && k.toLowerCase() === 'content-type') return true; }
    return false;
  }
  function applyDefaultContentType(opts) {
    if (!opts || opts.body == null) return;
    var b = opts.body, ct = null;
    if (typeof URLSearchParams !== 'undefined' && b instanceof URLSearchParams) {
      opts.body = b.toString();                 
      ct = 'application/x-www-form-urlencoded;charset=UTF-8';
    } else if (typeof b === 'string') {
      ct = 'text/plain;charset=UTF-8';
    } else if (b instanceof Uint8Array || b instanceof ArrayBuffer || ArrayBuffer.isView(b)) {
      ct = 'application/octet-stream';
    }
    if (ct && !hasContentType(opts.headers)) {
      opts.headers = opts.headers || {};
      opts.headers['Content-Type'] = ct;
    }
  }
  var fetchImpl = async function(url, opts) {
    applyDefaultContentType(opts);
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
