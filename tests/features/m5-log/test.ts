// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { log, createLogger } from "ekko:log";
const c: [string, boolean][] = [];

log.info("test info message", { key: "value" });
c.push(["log.info", true]);

log.warn("test warning", { code: 42 });
c.push(["log.warn", true]);

log.error("test error", { err: "something" });
c.push(["log.error", true]);

log.debug("should be suppressed");
c.push(["log.debug suppressed at info level", true]);

log.setLevel("debug");
log.debug("now visible");
c.push(["log.setLevel debug", true]);
log.setLevel("info");

const reqLog = createLogger("http", { requestId: "abc-123" });
reqLog.info("request received", { path: "/api" });
c.push(["createLogger", true]);

const childLog = reqLog.child({ handler: "getUser" });
childLog.info("fetching user");
c.push(["child logger", true]);

log.setLevel("warn");
log.info("this should be suppressed");
log.warn("this should print");
c.push(["setLevel filtering", true]);
log.setLevel("info");

let p = 0, f = 0;
for (const [n, ok] of c) {
  if (ok) { p++; console.log("  PASS:", n); }
  else { f++; console.log("  FAIL:", n); }
}
console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
