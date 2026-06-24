// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(function() {
  var ReadableStream = (function() {
    function RS(underlyingSource) {
      this._queue = []; this._closed = false; this._errored = null; this._reader = null;
      this._pullResolve = null; this._started = false;
      var self = this;
      var ctrl = {
        enqueue: function(chunk) {
          self._queue.push(chunk);
          if (self._pullResolve) { self._pullResolve(); self._pullResolve = null; }
        },
        close: function() { self._closed = true; if (self._pullResolve) { self._pullResolve(); self._pullResolve = null; } },
        error: function(e) { self._errored = e; if (self._pullResolve) { self._pullResolve(); self._pullResolve = null; } },
        desiredSize: 1
      };
      this._controller = ctrl;
      this._source = underlyingSource || {};
      if (this._source.start) {
        var r = this._source.start(ctrl);
        if (r && typeof r.then === 'function') r.then(function() { self._started = true; });
        else self._started = true;
      } else { this._started = true; }
    }
    RS.prototype.getReader = function() {
      if (this._reader) throw new TypeError('ReadableStream is already locked');
      var stream = this;
      var reader = {
        read: function() {
          if (stream._errored) return Promise.reject(stream._errored);
          if (stream._queue.length > 0) return Promise.resolve({ value: stream._queue.shift(), done: false });
          if (stream._closed) return Promise.resolve({ value: undefined, done: true });
          return new Promise(function(resolve) {
            stream._pullResolve = function() {
              if (stream._errored) { resolve(Promise.reject(stream._errored)); return; }
              if (stream._queue.length > 0) { resolve({ value: stream._queue.shift(), done: false }); return; }
              if (stream._closed) { resolve({ value: undefined, done: true }); return; }
            };
            if (stream._source.pull) stream._source.pull(stream._controller);
          });
        },
        cancel: function(reason) { stream._closed = true; if (stream._source.cancel) stream._source.cancel(reason); return Promise.resolve(); },
        releaseLock: function() { stream._reader = null; },
        get closed() { return stream._closed ? Promise.resolve() : new Promise(function() {}); }
      };
      reader[Symbol.asyncIterator] = function() {
        return { next: function() { return reader.read(); }, return: function() { reader.cancel(); return Promise.resolve({ value: undefined, done: true }); } };
      };
      this._reader = reader;
      return reader;
    };
    RS.prototype[Symbol.asyncIterator] = function() {
      var r = this.getReader();
      return {
        next: function() { return r.read().then(function(v) { return v.done ? { value: undefined, done: true } : { value: v.value, done: false }; }); },
        return: function() { r.cancel(); return Promise.resolve({ value: undefined, done: true }); }
      };
    };
    return RS;
  })();

  var TextEncoderImpl = (function() {
    function TE() {}
    TE.prototype.encode = function(str) {
      var buf = [];
      for (var i = 0; i < str.length; i++) {
        var c = str.codePointAt(i); 
        if (c > 0xffff) i++;        
        if (c < 128) buf.push(c);
        else if (c < 2048) { buf.push(192 | (c >> 6), 128 | (c & 63)); }
        else if (c < 65536) { buf.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
        else { buf.push(240 | (c >> 18), 128 | ((c >> 12) & 63), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
      }
      return new Uint8Array(buf);
    };
    return TE;
  })();

  var TextDecoderImpl = (function() {
    function TD() {}
    TD.prototype.decode = function(buf) {
      if (!buf) return '';
      var arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
      var s = '';
      for (var i = 0; i < arr.length; i++) {
        var b = arr[i];
        if (b < 128) s += String.fromCharCode(b);
        else if (b < 224) { s += String.fromCharCode(((b & 31) << 6) | (arr[++i] & 63)); }
        else if (b < 240) { s += String.fromCharCode(((b & 15) << 12) | ((arr[++i] & 63) << 6) | (arr[++i] & 63)); }
        else { s += String.fromCodePoint(((b & 7) << 18) | ((arr[++i] & 63) << 12) | ((arr[++i] & 63) << 6) | (arr[++i] & 63)); } 
      }
      return s;
    };
    return TD;
  })();

  
  var _uspDec = function(s){ try { return decodeURIComponent(String(s).replace(/\+/g, ' ')); } catch (e) { return String(s); } };
  var _uspEnc = function(s){ return encodeURIComponent(String(s)).replace(/%20/g, '+'); };
  function URLSearchParams(init){
    this._list = [];
    if (init === undefined || init === null || init === '') return;
    if (init instanceof URLSearchParams){ for (var a = 0; a < init._list.length; a++) this._list.push([init._list[a][0], init._list[a][1]]); return; }
    if (typeof init === 'string'){
      var s = init.charAt(0) === '?' ? init.slice(1) : init;
      if (!s) return;
      var parts = s.split('&');
      for (var i = 0; i < parts.length; i++){
        if (parts[i] === '') continue;
        var idx = parts[i].indexOf('='), k, v;
        if (idx < 0){ k = parts[i]; v = ''; } else { k = parts[i].slice(0, idx); v = parts[i].slice(idx + 1); }
        this._list.push([_uspDec(k), _uspDec(v)]);
      }
      return;
    }
    if (Array.isArray(init)){ for (var j = 0; j < init.length; j++) this._list.push([String(init[j][0]), String(init[j][1])]); return; }
    if (typeof init === 'object'){ var keys = Object.keys(init); for (var n = 0; n < keys.length; n++) this._list.push([keys[n], String(init[keys[n]])]); return; }
  }
  URLSearchParams.prototype.append = function(k, v){ this._list.push([String(k), String(v)]); };
  URLSearchParams.prototype['delete'] = function(k){ k = String(k); this._list = this._list.filter(function(p){ return p[0] !== k; }); };
  URLSearchParams.prototype.get = function(k){ k = String(k); for (var i = 0; i < this._list.length; i++) if (this._list[i][0] === k) return this._list[i][1]; return null; };
  URLSearchParams.prototype.getAll = function(k){ k = String(k); var r = []; for (var i = 0; i < this._list.length; i++) if (this._list[i][0] === k) r.push(this._list[i][1]); return r; };
  URLSearchParams.prototype.has = function(k){ return this.get(String(k)) !== null; };
  URLSearchParams.prototype.set = function(k, v){ k = String(k); v = String(v); var done = false, out = []; for (var i = 0; i < this._list.length; i++){ if (this._list[i][0] === k){ if (!done){ out.push([k, v]); done = true; } } else out.push(this._list[i]); } if (!done) out.push([k, v]); this._list = out; };
  URLSearchParams.prototype.sort = function(){ this._list.sort(function(a, b){ return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; }); };
  URLSearchParams.prototype.forEach = function(cb, thisArg){ for (var i = 0; i < this._list.length; i++) cb.call(thisArg, this._list[i][1], this._list[i][0], this); };
  URLSearchParams.prototype.keys = function(){ return this._list.map(function(p){ return p[0]; })[Symbol.iterator](); };
  URLSearchParams.prototype.values = function(){ return this._list.map(function(p){ return p[1]; })[Symbol.iterator](); };
  URLSearchParams.prototype.entries = function(){ return this._list.map(function(p){ return [p[0], p[1]]; })[Symbol.iterator](); };
  URLSearchParams.prototype[Symbol.iterator] = URLSearchParams.prototype.entries;
  URLSearchParams.prototype.toString = function(){ return this._list.map(function(p){ return _uspEnc(p[0]) + '=' + _uspEnc(p[1]); }).join('&'); };
  Object.defineProperty(URLSearchParams.prototype, 'size', { get: function(){ return this._list.length; } });

  
  function URL(url, base){
    url = String(url);
    if (base !== undefined && base !== null && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)){
      var b = new URL(String(base));
      if (url.charAt(0) === '/') url = b.protocol + '//' + b.host + url;
      else if (url.charAt(0) === '?') url = b.protocol + '//' + b.host + b.pathname + url;
      else if (url.charAt(0) === '#') url = b.protocol + '//' + b.host + b.pathname + b.search + url;
      else url = b.protocol + '//' + b.host + b.pathname.replace(/[^/]*$/, '') + url;
    }
    var m = /^([a-zA-Z][a-zA-Z0-9+.-]*:)\/\/(?:([^:@/?#]*)(?::([^@/?#]*))?@)?([^:/?#]*)(?::(\d+))?([^?#]*)(\?[^#]*)?(#.*)?$/.exec(url);
    if (m){
      this.protocol = m[1]; this.username = m[2] || ''; this.password = m[3] || ''; this.hostname = m[4] || '';
      this.port = m[5] || ''; this.pathname = m[6] || '/'; this.hash = m[8] || '';
      this.searchParams = new URLSearchParams(m[7] || '');
    } else {
      var m2 = /^([a-zA-Z][a-zA-Z0-9+.-]*:)([^?#]*)(\?[^#]*)?(#.*)?$/.exec(url);
      if (!m2) throw new TypeError('Invalid URL: ' + url);
      this.protocol = m2[1]; this.username = ''; this.password = ''; this.hostname = ''; this.port = '';
      this.pathname = m2[2] || ''; this.hash = m2[4] || ''; this.searchParams = new URLSearchParams(m2[3] || '');
    }
  }
  Object.defineProperty(URL.prototype, 'host', { get: function(){ return this.hostname + (this.port ? ':' + this.port : ''); } });
  Object.defineProperty(URL.prototype, 'search', { get: function(){ var s = this.searchParams.toString(); return s ? '?' + s : ''; }, set: function(v){ this.searchParams = new URLSearchParams(String(v)); } });
  Object.defineProperty(URL.prototype, 'origin', { get: function(){ var p = this.protocol.replace(':', ''); return (p === 'http' || p === 'https' || p === 'ws' || p === 'wss' || p === 'ftp') ? this.protocol + '//' + this.host : 'null'; } });
  Object.defineProperty(URL.prototype, 'href', { get: function(){
    var auth = this.username ? (this.username + (this.password ? ':' + this.password : '') + '@') : '';
    var host = this.hostname ? ('//' + auth + this.host) : '';
    return this.protocol + host + this.pathname + this.search + this.hash;
  } });
  URL.prototype.toString = function(){ return this.href; };
  URL.prototype.toJSON = function(){ return this.href; };

  Object.defineProperty(globalThis, 'ReadableStream', { value: ReadableStream, writable: false, configurable: false });
  if (!globalThis.TextEncoder) Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoderImpl, writable: false, configurable: false });
  else Object.defineProperty(globalThis, 'TextEncoder', { value: globalThis.TextEncoder, writable: false, configurable: false });
  if (!globalThis.TextDecoder) Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoderImpl, writable: false, configurable: false });
  else Object.defineProperty(globalThis, 'TextDecoder', { value: globalThis.TextDecoder, writable: false, configurable: false });
  if (!globalThis.URLSearchParams) Object.defineProperty(globalThis, 'URLSearchParams', { value: URLSearchParams, writable: false, configurable: false });
  if (!globalThis.URL) Object.defineProperty(globalThis, 'URL', { value: URL, writable: false, configurable: false });
})();
