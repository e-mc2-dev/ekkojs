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
  var fn = function() {
    var ch = this;
    return {
      next: function() {
        return ch.recv().then(function(v) {
          return v === undefined ? { value: undefined, done: true } : { value: v, done: false };
        });
      },
      [Symbol.asyncIterator]: function() { return this; }
    };
  };
  return fn;
})()
