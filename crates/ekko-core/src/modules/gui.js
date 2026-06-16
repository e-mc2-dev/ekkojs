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
  var _cb = null;
  async function _poll() {
    while (true) {
      var raw = await ops.recv();
      if (raw === null || raw === "null") break;
      try {
        var msg = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch(_) {
        var msg = raw;
      }
      if (_cb) _cb(msg);
    }
  }
  return {
    onMessage: function(fn) {
      _cb = fn;
      _poll();
    }
  };
})
