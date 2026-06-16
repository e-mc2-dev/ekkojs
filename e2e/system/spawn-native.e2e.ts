// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { asserter } from "../_harness.ts";

const t = asserter();

await (async () => {
  t.group("worker imports + uses a native module (no permission needed)");
  const enc = await Ekko.spawn(async () => {
    const e = await import("ekko:text/encoding");
    return e.base64.encode("hello");
  });
  t.check("ekko:text/encoding usable in a worker", typeof enc === "string" && enc.length > 0);

  t.group("worker reads a file via ekko:fs when granted allow:[fs]");
  const len = await Ekko.spawn(async (p) => {
    const fs = await import("ekko:fs");
    return fs.readText(p).length;
  }, { args: ["Cargo.toml"], allow: ["fs"] });
  t.check("worker read Cargo.toml (length > 0)", typeof len === "number" && len > 0);

  t.group("reused pooled worker thread: many spawns each import (cross-isolate cache regression)");
  for (let i = 0; i < 6; i++) {
    const v = await Ekko.spawn(async () => {
      const e = await import("ekko:text/encoding");
      return e.base64.encode("x" + Date.now());
    });
    t.check("spawn #" + i + " dynamic import ok (no isolate-handle abort)", typeof v === "string" && v.length > 0);
  }

  t.group("permission gate: worker WITHOUT allow:[fs] is denied");
  let denied = false;
  try {
    await Ekko.spawn(async (p) => {
      const fs = await import("ekko:fs");
      return fs.readText(p);
    }, { args: ["Cargo.toml"] }); 
  } catch {
    denied = true; 
  }
  t.check("worker without fs grant is denied", denied);

  t.group("Ekko.parallel workers are native-capable too, and honor the shared allow");
  const results = await Ekko.parallel([
    async () => { const e = await import("ekko:text/encoding"); return e.base64.encode("p"); },
    async () => { const fs = await import("ekko:fs"); return fs.readText("Cargo.toml").length; },
  ], { allow: ["fs"] });
  t.check("parallel[0] encoding import in worker", typeof results[0] === "string" && results[0].length > 0);
  t.check("parallel[1] fs read under shared allow:[fs]", typeof results[1] === "number" && results[1] > 0);
})();

t.done("Ekko.spawn / Ekko.parallel — native modules in workers");
