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
        var c = str.charCodeAt(i);
        if (c < 128) buf.push(c);
        else if (c < 2048) { buf.push(192 | (c >> 6), 128 | (c & 63)); }
        else { buf.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
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
        else { s += String.fromCharCode(((b & 15) << 12) | ((arr[++i] & 63) << 6) | (arr[++i] & 63)); }
      }
      return s;
    };
    return TD;
  })();

  Object.defineProperty(globalThis, 'ReadableStream', { value: ReadableStream, writable: false, configurable: false });
  if (!globalThis.TextEncoder) Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoderImpl, writable: false, configurable: false });
  else Object.defineProperty(globalThis, 'TextEncoder', { value: globalThis.TextEncoder, writable: false, configurable: false });
  if (!globalThis.TextDecoder) Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoderImpl, writable: false, configurable: false });
  else Object.defineProperty(globalThis, 'TextDecoder', { value: globalThis.TextDecoder, writable: false, configurable: false });
})();
