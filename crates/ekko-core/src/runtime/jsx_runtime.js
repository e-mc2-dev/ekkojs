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
  var useState = function(init) { return [typeof init === 'function' ? init() : init, function() {}]; };
  var useEffect = function() {};
  var useRef = function(init) { return { current: init }; };
  var useMemo = function(fn) { return fn(); };
  var useCallback = function(fn) { return fn; };
  var useContext = function() { return undefined; };

  var defs = {
    useState: useState, useEffect: useEffect, useRef: useRef,
    useMemo: useMemo, useCallback: useCallback, useContext: useContext
  };
  for (var k in defs) {
    if (Object.prototype.hasOwnProperty.call(defs, k)) {
      Object.defineProperty(globalThis, k, { value: defs[k], writable: false, configurable: false });
    }
  }
})();
