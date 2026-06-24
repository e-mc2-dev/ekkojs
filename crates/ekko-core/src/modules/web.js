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
var MIME = {html:'text/html',css:'text/css',js:'application/javascript',json:'application/json',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml',ico:'image/x-icon',webp:'image/webp',avif:'image/avif',txt:'text/plain',woff:'font/woff',woff2:'font/woff2',pdf:'application/pdf',xml:'text/xml',mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',wasm:'application/wasm'};

var SAFE_SEG = /^[A-Za-z0-9_\-\[\]]+$/;
var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64dec(s) {
  var o = [];
  for (var i = 0; i < s.length;) {
    var a = B64.indexOf(s[i++]), b = B64.indexOf(s[i++]),
        c = B64.indexOf(s[i++]), d = B64.indexOf(s[i++]);
    o.push((a << 2) | (b >> 4));
    if (c !== -1) o.push(((b & 15) << 4) | (c >> 2));
    if (d !== -1) o.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(o);
}

function cookieScrub(s) { return String(s).replace(/[\r\n;]/g, ''); }

function headerScrub(s) { return String(s).replace(/[\r\n]/g, ''); }

function _ctEq(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function fullyDecode(s) { var p = s, prev = null, g = 0; while (p !== prev && g++ < 10) { prev = p; try { p = decodeURIComponent(p); } catch (e) { break; } } return p; }

var processHandlers = {};
var tcpServerHandlers = {};

function matchPath(pattern, actual) {
  if (pattern === actual) return true;
  var pp = pattern.split('/').filter(Boolean);
  var ap = actual.split('/').filter(Boolean);
  for (var i = 0; i < pp.length; i++) {
    if (pp[i].startsWith('*')) return ap.length >= i + 1;
    if (i >= ap.length) return false;
    if (!pp[i].startsWith(':') && !pp[i].startsWith('{') && pp[i] !== ap[i]) return false;
  }
  return pp.length === ap.length;
}

function extractParams(pattern, actual) {
  var pp = pattern.split('/').filter(Boolean);
  var ap = actual.split('/').filter(Boolean);
  var p = {};
  for (var i = 0; i < pp.length; i++) {
    if (pp[i].startsWith('*')) { p[pp[i].slice(1)] = ap.slice(i).map(decodeURIComponent); break; }
    if (pp[i].startsWith(':')) p[pp[i].slice(1)] = decodeURIComponent(ap[i] || '');
    else if (pp[i].startsWith('{')) p[pp[i].slice(1, -1)] = decodeURIComponent(ap[i] || '');
  }
  return p;
}

function validateUrl(url) {
  var qi = url.indexOf('?');
  var path = qi >= 0 ? url.slice(0, qi) : url;
  var qs = qi >= 0 ? url.slice(qi + 1) : '';
  var segs = path.split('/').filter(Boolean);
  for (var i = 0; i < segs.length; i++) { if (!SAFE_SEG.test(segs[i])) return false; }
  if (qs) {
    if (/&&/.test(qs) || qs.charAt(0) === '&' || qs.charAt(qs.length - 1) === '&') return false;
    var pairs = qs.split('&');
    for (var j = 0; j < pairs.length; j++) {
      var eq = pairs[j].indexOf('=');
      if (eq < 0) return false;
      var k = pairs[j].slice(0, eq), v = pairs[j].slice(eq + 1);
      if (!k || !SAFE_SEG.test(k)) return false;
      if (v && !SAFE_SEG.test(v)) return false;
    }
  }
  return true;
}

function routerMatch(pattern, actual) {
  var url = actual.split('?')[0];
  if (!validateUrl(url)) return false;
  return matchPath(pattern, url);
}

function routerExtractParams(pattern, actual) {
  var url = actual.split('?')[0];
  var params = extractParams(pattern, url);
  for (var k in params) {
    var v = params[k];
    if (typeof v === 'string' && !SAFE_SEG.test(v)) return null;
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) { if (!SAFE_SEG.test(v[i])) return null; } }
  }
  return params;
}

function makeRes(handle) {
  return {
    _s: 200, _h: {}, _sent: false,
    status: function(c) { this._s = c; return this; },
    header: function(k, v) { this._h[headerScrub(k)] = headerScrub(v); return this; },
    json: function(d) { this._h['content-type'] = 'application/json'; ops.sendResponse(handle, this._s, JSON.stringify(this._h), JSON.stringify(d)); this._sent = true; },
    text: function(b) { this._h['content-type'] = 'text/plain'; ops.sendResponse(handle, this._s, JSON.stringify(this._h), b || ''); this._sent = true; },
    html: function(b) { this._h['content-type'] = 'text/html'; ops.sendResponse(handle, this._s, JSON.stringify(this._h), b || ''); this._sent = true; },
    send: function(b) { ops.sendResponse(handle, this._s, JSON.stringify(this._h), b); this._sent = true; },
    redirect: function(url, code) { this._s = code || 302; this._h['location'] = headerScrub(url); ops.sendResponse(handle, this._s, JSON.stringify(this._h), ''); this._sent = true; },
    cookie: function(name, value, o) {
      o = o || {};
      var c = cookieScrub(name) + '=' + encodeURIComponent(value) + '; Path=' + cookieScrub(o.path || '/');
      if (o.maxAge) c += '; Max-Age=' + o.maxAge;
      if (o.httpOnly !== false) c += '; HttpOnly';
      var sameSite = o.sameSite || 'Lax';
      if (sameSite === 'None') c += '; Secure';
      else if (o.secure) c += '; Secure';
      c += '; SameSite=' + sameSite;
      if (o.domain) c += '; Domain=' + cookieScrub(o.domain);
      if (o.expires) c += '; Expires=' + new Date(o.expires).toUTCString();
      this._h['set-cookie'] = (this._h['set-cookie'] ? this._h['set-cookie'] + ', ' : '') + c;
      return this;
    }
  };
}

var __WEB_DEV_RELOAD_CLIENT =
  '(function(){var u=(location.protocol==="https:"?"wss:":"ws:")+"//"+location.host+"/__ekko_dev/live";' +
  'var ws=null,t=null;function c(){try{ws=new WebSocket(u);}catch(e){return;}' +
  'ws.onmessage=function(e){if(e.data==="reload")location.reload();};' +
  'ws.onclose=function(){ws=null;if(!t)t=setInterval(function(){try{var p=new WebSocket(u);' +
  'p.onopen=function(){p.close();clearInterval(t);t=null;location.reload();};p.onerror=function(){p.close();};}catch(e){}},1000);};}c();})();';

function __webInjectDevReload(dataBytes) {
  try {
    var html = new TextDecoder().decode(dataBytes);
    if (html.indexOf('/__ekko_dev/live.js') >= 0) return dataBytes;
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, '<script src="/__ekko_dev/live.js"></script></body>');
    else html = html + '<script src="/__ekko_dev/live.js"></script>';
    return new TextEncoder().encode(html);
  } catch (e) { return dataBytes; }
}

function createServer(opts) {
  var routes = [];
  var mws = [];
  var statics = [];
  var wsRoutes = {};

  var __WEBDEV = (function(){ try { return Ekko.env.get("EKKO_DEV") === "1"; } catch (e) { return false; } })();
  var __WEBDEV_TOKEN = __WEBDEV ? (function(){ try { return Ekko.env.get("EKKO_DEV_TOKEN") || ""; } catch (e) { return ""; } })() : "";
  var wsSockets = {};
  var authSchemes = {};
  var _onError = null;
  var _rlCounters = {};

  function rr(m, p, a) {
    var o = typeof a[0] === 'object' && !Array.isArray(a[0]) ? a.shift() : {};

    
    var handler = a[a.length - 1];
    var mids = a.slice(0, a.length - 1).filter(function (x) { return typeof x === 'function'; });
    if (mids.length) o = Object.assign({}, o, { middleware: (o.middleware || []).concat(mids) });
    routes.push({ method: m, path: p, handler: handler, opts: o });
  }

  function handleRoute(req, res, handle) {
    if (res._sent) return;
    for (var si = 0; si < statics.length; si++) {
      var sd = statics[si];

      if (sd.prefix === '/' || req.path === sd.prefix || req.path.startsWith(sd.prefix + '/')) {
        var rel = req.path.slice(sd.prefix === '/' ? 1 : sd.prefix.length).replace(/^\//, '');

        
        
        var relDec = fullyDecode(rel);
        if (rel.indexOf('..') >= 0 || relDec.indexOf('..') >= 0 ||
            relDec.charAt(0) === '/' || relDec.indexOf('\\') >= 0 || relDec.indexOf('\0') >= 0) {
          res.status(403).json({ error: 'Forbidden' }); res._sent = true; return;
        }
        var fp = sd.dir + (rel ? '/' + rel : '');
        try {
          var data = ops.readStaticFile(fp);
          var ext = fp.split('.').pop() || '';
          var ct = MIME[ext] || 'application/octet-stream';
          res._h['content-type'] = ct;
          var sdO = sd.opts || {};
          if (__WEBDEV) {

            res._h['cache-control'] = 'no-cache, no-store, must-revalidate';
          } else {
            var ma = sdO.maxAge !== undefined ? sdO.maxAge : 31536000;
            res._h['cache-control'] = 'public, max-age=' + ma + (sdO.immutable !== false ? ', immutable' : '');
          }
          if (sdO.headers) { for (var hk in sdO.headers) res._h[headerScrub(hk)] = headerScrub(sdO.headers[hk]); }
          if (__WEBDEV && (ext === 'html' || ext === 'htm')) { data = __webInjectDevReload(data); }
          ops.sendResponse(handle, 200, JSON.stringify(res._h), data);
          res._sent = true;
          return;
        } catch (e) {  }
      }
    }
    var matched = null;
    for (var ri = 0; ri < routes.length; ri++) {
      var r = routes[ri];
      if (r.method === req.method && matchPath(r.path, req.path)) {
        matched = r;
        req.params = extractParams(r.path, req.path);
        break;
      }
    }
    if (!matched) {

      
      if (req.path.indexOf('.') < 0) {
        for (var sj = 0; sj < statics.length; sj++) {
          var sfo = statics[sj].opts || {};
          if (sfo.spa || sfo.index) {
            try {
              var spaIdx = ops.readStaticFile(statics[sj].dir + '/index.html');
              if (__WEBDEV) spaIdx = __webInjectDevReload(spaIdx);
              res._h['content-type'] = 'text/html; charset=utf-8';
              res._h['cache-control'] = 'no-cache';
              ops.sendResponse(handle, 200, JSON.stringify(res._h), spaIdx);
              res._sent = true;
              return;
            } catch (e3) {}
          }
        }
      }
      res.status(404).text('Not Found'); return;
    }
    var mOpts = matched.opts || {};
    if (!mOpts.anonymous) {
      var authKey = mOpts.auth || null;
      if (authKey && authKey !== false) {
        var sn = typeof authKey === 'string' ? authKey : authKey.scheme;
        var scheme = authSchemes[sn];
        if (!scheme) { res.status(500).json({ error: 'Unknown auth scheme: ' + sn }); return; }
        try {
          var ar = scheme(req);
          if (ar && ar.then) {
            ar.then(function(r) { req.auth = r; postAuth(matched, mOpts, req, res, handle); })
              .catch(function(e) { res.status(401).json({ error: String(e.message || e) }); });
            return;
          }
          req.auth = ar;
        } catch (e) { res.status(401).json({ error: String(e.message || e) }); return; }
      }
    }
    postAuth(matched, mOpts, req, res, handle);
  }

  function postAuth(matched, mOpts, req, res, handle) {
    if (res._sent) return;
    if (mOpts.roles && mOpts.roles.length > 0) {
      var ur = req.user ? [].concat(req.user.roles || req.user.role || []) : (req.auth ? [].concat(req.auth.roles || req.auth.role || []) : []);
      if (!mOpts.roles.some(function(r) { return ur.indexOf(r) >= 0; })) { res.status(403).json({ error: 'Forbidden' }); return; }
    }
    if (mOpts.rateLimit) {
      var rl = mOpts.rateLimit; var ip = req.ip || 'unknown'; var key = matched.path + '|' + ip;
      var now = Date.now(); var c = _rlCounters[key];
      if (c && now - c.start < (rl.window || 60000)) { c.count++; if (c.count > rl.max) { res.status(429).json({ error: 'Too Many Requests' }); return; } }
      else { _rlCounters[key] = { start: now, count: 1 }; }
    }
    if (mOpts.middleware && mOpts.middleware.length > 0) {
      var idx = 0;
      function runRouteM() {
        if (idx < mOpts.middleware.length) {
          var mw = mOpts.middleware[idx++];
          try {
            var r = mw(req, res, runRouteM);
            if (r && r.then) r.catch(function(e) { _handlerError(e, req, res); });
          } catch (e) { _handlerError(e, req, res); }
        } else { callHandler(matched, req, res, handle); }
      }
      runRouteM();
    } else { callHandler(matched, req, res, handle); }
  }

  
  function _handlerError(e, req, res) {
    if (_onError) try { _onError(e, req, res); } catch (e2) {}
    if (res._sent) return;
    if (e && (e.bodyLimit || e.statusCode === 413)) {
      res.status(413).json({ error: 'Payload Too Large', maxBytes: (e && e.maxBytes) || (req && req.__bodyMax) || undefined });
      return;
    }
    res.status(500).json({ error: String(e) });
  }

  function callHandler(matched, req, res, handle) {
    if (res._sent) return;
    try {
      var result = matched.handler(req, res);
      if (result && result.then) {
        result.then(function() { if (!res._sent) ops.sendResponse(handle, res._s, JSON.stringify(res._h), ''); })
              .catch(function(e) { _handlerError(e, req, res); });
      } else { if (!res._sent) ops.sendResponse(handle, res._s, JSON.stringify(res._h), ''); }
    } catch (e) { _handlerError(e, req, res); }
  }

  

  

  
  function __attachReqBody(target, handle, contentLength) {
    var _hasBody = contentLength !== 0;
    target.bodyUsed = false;
    Object.defineProperty(target, '__byteLength', { value: contentLength > 0 ? contentLength : 0, enumerable: false, configurable: true });
    function claim() {
      if (target.bodyUsed) throw new TypeError('Body already used');
      target.bodyUsed = true;
    }
    function pullChunk() {
      return ops.readBodyChunk(handle).then(function(a) {
        if (!a || a.length === 0) return null;
        return a instanceof Uint8Array ? a : new Uint8Array(a);
      });
    }
    function drain() {
      try { claim(); } catch (e) { return Promise.reject(e); }
      if (!_hasBody) return Promise.resolve(new Uint8Array(0));
      var chunks = [], total = 0;
      function loop() {
        return pullChunk().then(function(c) {
          if (c === null) {
            var out = new Uint8Array(total), off = 0;
            for (var i = 0; i < chunks.length; i++) { out.set(chunks[i], off); off += chunks[i].length; }
            return out;
          }
          chunks.push(c); total += c.length;

          
          if (target.__bodyMax > 0 && total > target.__bodyMax) {
            var le = new Error('Payload Too Large'); le.statusCode = 413; le.bodyLimit = true; le.maxBytes = target.__bodyMax;
            throw le;
          }
          return loop();
        });
      }
      return loop();
    }
    target.bytes = function() { return drain(); };
    target.arrayBuffer = function() { return drain().then(function(b) { return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }); };
    target.text = function() { return drain().then(function(b) { return new TextDecoder().decode(b); }); };
    target.json = function() { return target.text().then(function(t) { return JSON.parse(t === '' ? 'null' : t); }); };
    var _bodyStream;
    Object.defineProperty(target, 'body', {
      enumerable: true, configurable: true,
      get: function() {
        if (!_hasBody) return null;

        if (!_bodyStream) {
          var _claimed = false;
          _bodyStream = new ReadableStream({
            pull: function(controller) {
              if (!_claimed) { _claimed = true; try { claim(); } catch (e) { controller.error(e); return; } }
              return pullChunk().then(function(c) { if (c === null) controller.close(); else controller.enqueue(c); });
            }
          });
        }
        return _bodyStream;
      }
    });
    target.clone = function() {

      var buffered = drain(); 
      function attachBuffered(t) {
        t.bodyUsed = false; var used = false;
        function claimB() { if (used) throw new TypeError('Body already used'); used = true; t.bodyUsed = true; }
        t.bytes = function() { try { claimB(); } catch (e) { return Promise.reject(e); } return buffered.then(function(b) { return b; }); };
        t.arrayBuffer = function() { return t.bytes().then(function(b) { return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }); };
        t.text = function() { return t.bytes().then(function(b) { return new TextDecoder().decode(b); }); };
        t.json = function() { return t.text().then(function(x) { return JSON.parse(x === '' ? 'null' : x); }); };
        Object.defineProperty(t, 'body', { enumerable: true, configurable: true, get: function() {
          return new ReadableStream({ start: function(c) { buffered.then(function(b) { c.enqueue(b); c.close(); }); } });
        }});
      }
      var c = {};
      for (var k in target) { if (k !== 'body' && k !== 'bodyUsed' && typeof target[k] !== 'function') c[k] = target[k]; }
      attachBuffered(target); attachBuffered(c);
      return c;
    };
  }

  function dispatch(json, handle) {
    var req;
    try { req = JSON.parse(json); } catch (e) { ops.sendResponse(handle, 500, '{"content-type":"application/json"}', '{"error":"bad request json"}'); return; }
    if (req.type === 'process_stdout') { var h = processHandlers[req.handle]; if (h && h._stdout) h._stdout(b64dec(req.data)); return; }
    if (req.type === 'process_stderr') { var h2 = processHandlers[req.handle]; if (h2 && h2._stderr) h2._stderr(b64dec(req.data)); return; }
    if (req.type === 'process_exit') { var h3 = processHandlers[req.handle]; if (h3 && h3._exitResolve) h3._exitResolve(req.code); delete processHandlers[req.handle]; return; }
    if (req.type === 'tcp_connect') {
      var conn = { _h: req.handle, ip: req.ip, port: req.port,
        write: function(d) { tcp.write(this._h, d); },
        read: function(n) { return tcp.read(this._h, n || 4096); },
        close: function() { tcp.close(this._h); }
      };
      for (var fn_ in tcpServerHandlers) { if (Object.prototype.hasOwnProperty.call(tcpServerHandlers, fn_)) tcpServerHandlers[fn_](conn); }
      return;
    }
    if (req.type === 'ws_connect') {
      var wsHandler = wsRoutes[req.path];
      if (!wsHandler) return;
      var sock = { _h: req.wsHandle, _cbs: {}, on: function(e, fn) { this._cbs[e] = fn; }, send: function(d) { ops.wsSendServer(this._h, d); }, close: function(code) { ops.wsCloseServer(this._h, code || 1000); } };
      wsSockets[req.wsHandle] = sock;
      wsHandler(sock, req);
      return;
    }
    if (req.type === 'ws_message') { var wsSock = wsSockets[req.wsHandle]; if (wsSock && wsSock._cbs.message) wsSock._cbs.message(req.data); return; }
    if (req.type === 'ws_error') { var wsSockE = wsSockets[req.wsHandle]; if (wsSockE && wsSockE._cbs.error) wsSockE._cbs.error(new Error(req.error)); delete wsSockets[req.wsHandle]; return; }
    if (req.type === 'ws_close') { var wsSock2 = wsSockets[req.wsHandle]; if (wsSock2 && wsSock2._cbs.close) wsSock2._cbs.close(req.code); delete wsSockets[req.wsHandle]; return; }

    
    var __cl = typeof req.contentLength === 'number' ? req.contentLength : 0;
    delete req.contentLength;
    req.cookies = {};
    if (req.headers && req.headers.cookie) { req.headers.cookie.split(';').forEach(function(c) { var parts = c.trim().split('='); var ck = parts.shift(); if (ck) req.cookies[ck.trim()] = decodeURIComponent(parts.join('=')); }); }
    __attachReqBody(req, handle, __cl);
    if (req.method && req.path) {
      var segs = req.path.split('/').filter(Boolean);
      for (var si = 0; si < segs.length; si++) { if (!SAFE_SEG.test(segs[si]) && !segs[si].includes('.')) { ops.sendResponse(handle, 400, '{"content-type":"application/json"}', '{"error":"invalid URL segment"}'); return; } }
      if (req.query && req.query.length > 1) {
        var qs = req.query.charAt(0) === '?' ? req.query.slice(1) : req.query;
        if (qs && (/&&/.test(qs) || qs.charAt(0) === '&' || qs.charAt(qs.length - 1) === '&')) { ops.sendResponse(handle, 400, '{"content-type":"application/json"}', '{"error":"invalid query string"}'); return; }
      }
    }
    var res = makeRes(handle);
    function runMws(i) {
      if (i < mws.length) {
        var mw = mws[i];
        try {
          var r = mw(req, res, function() { runMws(i + 1); });
          if (r && r.then) r.catch(function(e) { _handlerError(e, req, res); });
        } catch (e) { _handlerError(e, req, res); }
      } else { handleRoute(req, res, handle); }
    }

    
    for (var bsi = 0; bsi < statics.length; bsi++) {
      var bst = statics[bsi];
      if (bst.opts && bst.opts.before && (req.path === bst.prefix || req.path.startsWith(bst.prefix + '/'))) {
        handleRoute(req, res, handle); return;
      }
    }
    runMws(0);
  }

  var server = {
    get: function(p) { var a = Array.prototype.slice.call(arguments, 1); rr('GET', p, a); return server; },
    post: function(p) { var a = Array.prototype.slice.call(arguments, 1); rr('POST', p, a); return server; },
    put: function(p) { var a = Array.prototype.slice.call(arguments, 1); rr('PUT', p, a); return server; },
    delete: function(p) { var a = Array.prototype.slice.call(arguments, 1); rr('DELETE', p, a); return server; },
    patch: function(p) { var a = Array.prototype.slice.call(arguments, 1); rr('PATCH', p, a); return server; },
    route: function(c) { routes.push({ method: c.method, path: c.path, handler: c.handler, opts: c.config || {} }); return server; },
    auth: function(name, fn) { authSchemes[name] = fn; return server; },
    ws: function(p, handler) { wsRoutes[p] = handler; return server; },
    use: function() { for (var i = 0; i < arguments.length; i++) mws.push(arguments[i]); return server; },
    static: function(prefix, dir, o) { statics.push({ prefix: prefix, dir: dir, opts: o || {} }); return server; },
    onError: function(fn) { _onError = fn; return server; },
    group: function(prefix) {
      var args = Array.prototype.slice.call(arguments, 1);
      var gOpts = typeof args[0] === 'object' && !Array.isArray(args[0]) ? args.shift() : {};
      var fn = args[0];
      var g;
      function gr(method, p, a) {
        var o = typeof a[0] === 'object' && !Array.isArray(a[0]) ? a.shift() : {};
        var handler = a[a.length - 1];
        var mids = a.slice(0, a.length - 1).filter(function (x) { return typeof x === 'function'; });
        var merged = Object.assign({}, gOpts, o);
        var allMids = (gOpts.middleware || []).concat(o.middleware || []).concat(mids);
        if (allMids.length) merged.middleware = allMids;
        routes.push({ method: method, path: prefix + p, handler: handler, opts: merged });
        return g;
      }
      g = {
        get: function(p) { return gr('GET', p, Array.prototype.slice.call(arguments, 1)); },
        post: function(p) { return gr('POST', p, Array.prototype.slice.call(arguments, 1)); },
        put: function(p) { return gr('PUT', p, Array.prototype.slice.call(arguments, 1)); },
        delete: function(p) { return gr('DELETE', p, Array.prototype.slice.call(arguments, 1)); },
        patch: function(p) { return gr('PATCH', p, Array.prototype.slice.call(arguments, 1)); }
      };
      fn(g);
      return server;
    },
    start: function() {
      if (__WEBDEV) {

        wsRoutes['/__ekko_dev/live'] = function (sock) {  };
        routes.push({ method: 'GET', path: '/__ekko_dev/live.js', opts: { anonymous: true },
          handler: function (req, res) { res.header('content-type', 'application/javascript').send(__WEB_DEV_RELOAD_CLIENT); } });
        routes.push({ method: 'POST', path: '/__ekko_dev/shutdown', opts: { anonymous: true },
          handler: function (req, res) {
            var tok = (req.headers && (req.headers['x-ekko-dev-token'] || req.headers['X-Ekko-Dev-Token'])) || '';
            if (!__WEBDEV_TOKEN || tok !== __WEBDEV_TOKEN) { res.status(403).text('forbidden'); return; }
            res.status(200).text('ok');
            setTimeout(function () { try { ops.stopServer(); } catch (e) {} try { Ekko.exit(0); } catch (e) {} }, 40);
          } });
      }
      ops.registerHandler(dispatch);
      var t = opts && opts.tls || {};
      return ops.startServer(opts && opts.host || '0.0.0.0', opts && opts.port || 8080, t.cert || '', t.key || '', t.pfx || '', t.password || '', !!(opts && opts.http2), !!(opts && opts.compression), opts && opts.maxBodySize || 0, opts && opts.maxWsMessageSize || 0);
    },
    stop: function() { ops.stopServer(); },
    url: null
  };
  return server;
}

function cors(opts) {
  opts = opts || {};
  var origin = opts.origin || '*';
  var methods = (opts.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']).join(', ');
  var headers = (opts.headers || ['Content-Type', 'Authorization']).join(', ');
  var creds = opts.credentials || false;
  var maxAge = String(opts.maxAge || 86400);
  return function(req, res, next) {
    var ro = req.headers.origin || '*';
    var ok = origin === '*' || (Array.isArray(origin) ? origin.includes(ro) : origin === ro);
    if (ok) {
      res.header('access-control-allow-origin', typeof origin === 'string' ? origin : ro);
      res.header('access-control-allow-methods', methods);
      res.header('access-control-allow-headers', headers);
      if (creds) res.header('access-control-allow-credentials', 'true');
      res.header('access-control-max-age', maxAge);
    }
    if (req.method === 'OPTIONS') { res.status(204).text(''); return; }
    next();
  };
}

function rateLimit(opts) {
  var max = opts.max || 100; var win = opts.window || 60000; var msg = opts.message || 'Too many requests';
  var store = Object.create(null);   
  return function(req, res, next) {
    var key = req.ip || 'unknown'; var now = Date.now();
    if (!store[key] || now - store[key].t > win) store[key] = { t: now, c: 0 };
    store[key].c++;
    if (store[key].c > max) { res.status(429).json({ error: msg }); return; }
    res.header('x-ratelimit-limit', String(max));
    res.header('x-ratelimit-remaining', String(max - store[key].c));
    next();
  };
}

function helmet(opts) {
  opts = opts || {};
  return function(req, res, next) {
    res.header('x-content-type-options', 'nosniff');
    res.header('x-frame-options', opts.frameguard || 'DENY');
    res.header('x-xss-protection', '0');
    res.header('referrer-policy', 'strict-origin-when-cross-origin');
    if (opts.contentSecurityPolicy !== false) res.header('content-security-policy', opts.contentSecurityPolicy || "default-src 'self'");
    res.header('strict-transport-security', 'max-age=' + (opts.hsts && opts.hsts.maxAge || 31536000) + '; includeSubDomains');
    res.header('permissions-policy', opts.permissionsPolicy || 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  };
}

function safePath() {
  return function(req, res, next) {
    if (req.path.indexOf('..') >= 0 || fullyDecode(req.path).indexOf('..') >= 0) { res.status(403).json({ error: 'Forbidden' }); return; }
    next();
  };
}

function bodyLimit(opts) {
  var max = (opts && opts.max) || 1048576;
  return function(req, res, next) {
    var cl = parseInt(req.headers['content-length'] || '0', 10);
    
    if (cl > max) { res.status(413).json({ error: 'Payload Too Large', maxBytes: max }); return; }

    
    var bd = Object.getOwnPropertyDescriptor(req, 'body');
    var raw = bd && Object.prototype.hasOwnProperty.call(bd, 'value') ? bd.value : undefined;
    var inMem = (req.bodyBytes != null) ? req.bodyBytes
              : (typeof raw === 'string' || (raw && typeof raw.length === 'number')) ? raw : null;
    if (inMem != null && inMem.length > max) { res.status(413).json({ error: 'Payload Too Large', maxBytes: max }); return; }

    
    if (inMem == null) req.__bodyMax = max;
    next();
  };
}

function csrf(opts) {
  var hdr = (opts && opts.header) || 'x-csrf-token';
  var safe = ['GET', 'HEAD', 'OPTIONS'];
  var tokens = Object.create(null);   
  return function(req, res, next) {
    var key = req.sessionId || req.ip;
    if (safe.includes(req.method)) { var t = crypto.randomUUID(); tokens[key] = t; res.header('x-csrf-token', t); next(); return; }
    var exp = tokens[key]; var got = req.headers[hdr];
    
    if (!exp || !got || !_ctEq(exp, got)) { res.status(403).json({ error: 'CSRF token invalid' }); return; }
    tokens[key] = crypto.randomUUID(); res.header('x-csrf-token', tokens[key]); next();
  };
}

function errorHandler(opts) {
  var prod = !(opts && opts.production === false);
  function handle(e, req, res) {
    if (res._sent) return;

    if (e && (e.bodyLimit || e.statusCode === 413)) { res.status(413).json({ error: 'Payload Too Large', maxBytes: (e && e.maxBytes) || undefined }); return; }
    console.error('[ERROR]', req.method, req.path, String(e));
    res.status(500).json({ error: prod ? 'Internal Server Error' : String(e) });
  }
  return function(req, res, next) {
    try {
      var r = next();
      if (r && r.then) r.catch(function(e) { handle(e, req, res); });
    } catch (e) { handle(e, req, res); }
  };
}

function timeout(ms) {
  return function(req, res, next) {
    var t = setTimeout(function() { if (!res._sent) res.status(504).json({ error: 'Request timeout' }); }, ms);
    var oj = res.json; res.json = function(d) { clearTimeout(t); oj.call(this, d); };
    var ot = res.text; res.text = function(b) { clearTimeout(t); ot.call(this, b); };
    var oh = res.html; res.html = function(b) { clearTimeout(t); oh.call(this, b); };
    next();
  };
}

function httpsRedirect(opts) {
  var p = (opts && opts.httpsPort) || 443;
  return function(req, res, next) {
    if (req.protocol !== 'https' && req.headers['x-forwarded-proto'] !== 'https') {
      var h = (req.headers.host || 'localhost').split(':')[0];
      res.redirect('https://' + h + (p === 443 ? '' : ':' + p) + req.path, 301);
      return;
    }
    next();
  };
}

function secureCookies() {
  return function(req, res, next) {
    var oh = res.header;
    res.cookie = function(name, value, o) {
      o = o || {};
      var c = cookieScrub(name) + '=' + encodeURIComponent(value) + '; Path=' + cookieScrub(o.path || '/');
      if (o.maxAge) c += '; Max-Age=' + o.maxAge;
      if (o.httpOnly !== false) c += '; HttpOnly';
      if (o.secure !== false) c += '; Secure';
      c += '; SameSite=' + (o.sameSite || 'Lax');
      if (o.domain) c += '; Domain=' + cookieScrub(o.domain);
      oh.call(res, 'set-cookie', c);
      return res;
    };
    next();
  };
}

function requestId() {
  return function(req, res, next) {
    var id = req.headers['x-request-id'] || crypto.randomUUID();
    req.id = id; res.header('x-request-id', id); next();
  };
}

function ipFilter(opts) {
  var allow = (opts && opts.allow) || null; var deny = (opts && opts.deny) || [];
  return function(req, res, next) {
    if (deny.includes(req.ip)) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (allow && !allow.includes(req.ip)) { res.status(403).json({ error: 'Forbidden' }); return; }
    next();
  };
}

function validateContentType(opts) {
  var types = (opts && opts.types) || ['application/json', 'text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data'];
  var allowEmpty = !!(opts && opts.allowEmpty);
  var methods = ['POST', 'PUT', 'PATCH'];
  return function(req, res, next) {
    if (!methods.includes(req.method)) { next(); return; }
    var ct = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();

    if (!ct) { if (allowEmpty) { next(); return; } res.status(415).json({ error: 'Unsupported Media Type' }); return; }

    
    if (!types.some(function(t) { return ct === t.toLowerCase(); })) { res.status(415).json({ error: 'Unsupported Media Type' }); return; }
    next();
  };
}

var WebSocket = (function() {
  function WS(url) {
    this.url = url; this.readyState = 0; this._h = null;
    this.onopen = null; this.onmessage = null; this.onclose = null; this.onerror = null;
    this._connect();
  }
  WS.prototype._connect = async function() {
    var self = this;
    try {
      this._h = await ops.wsConnectClient(this.url);
      this.readyState = 1;

      ops.wsClientRecv(this._h,
        function(data) { if (self.onmessage) self.onmessage({ data: data }); },
        function(code) { self.readyState = 3; if (self.onclose) self.onclose({ code: code }); },
        function(err)  { if (self.onerror) self.onerror(new Error(err)); });
      if (this.onopen) this.onopen();
    }
    catch (e) { this.readyState = 3; if (this.onerror) this.onerror(e); }
  };
  WS.prototype.send = function(data) { if (this._h !== null) ops.wsClientSend(this._h, data); };
  WS.prototype.close = function(code, reason) { if (this._h !== null) { this.readyState = 2; ops.wsClientClose(this._h, code || 1000, reason || ''); this.readyState = 3; } };
  return WS;
})();

return {
  createServer: createServer,
  WebSocket: WebSocket,
  cors: cors,
  rateLimit: rateLimit,
  helmet: helmet,
  safePath: safePath,
  bodyLimit: bodyLimit,
  csrf: csrf,
  errorHandler: errorHandler,
  timeout: timeout,
  httpsRedirect: httpsRedirect,
  secureCookies: secureCookies,
  requestId: requestId,
  ipFilter: ipFilter,
  validateContentType: validateContentType
};
})
