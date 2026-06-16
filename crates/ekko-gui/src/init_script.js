// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

window.ekko = {
  send(data) {
    window.ipc.postMessage(JSON.stringify(data));
  },
  _listeners: [],
  onMessage(fn) {
    this._listeners.push(fn);
  },
  __dispatch(data) {
    for (const fn of this._listeners) fn(data);
  }
};
