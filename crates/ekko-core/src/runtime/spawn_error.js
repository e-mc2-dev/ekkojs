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
  class SpawnError extends Error {
    constructor(message, cause, contextId, childStack, parentStack) {
      super(message);
      this.name = 'SpawnError';
      this.cause = cause;
      this.contextId = contextId;
      this.stack = (childStack || '') + '\n    --- spawned from ---\n' + (parentStack || '');
    }
  }
  return SpawnError;
})()
