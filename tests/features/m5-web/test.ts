// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


import { createServer } from "ekko:web";
(async () => {
  const c: [string, boolean][] = [];

  const res = await fetch("https://httpbin.org/get");
  c.push(["fetch returns object", typeof res === "object" && res !== null]);
  c.push(["status 200", res.status === 200]);
  c.push(["ok is true", res.ok === true]);
  c.push(["has headers", typeof res.headers === "object"]);

  const text = await res.text();
  c.push(["text() returns string", typeof text === "string" && text.length > 0]);
  c.push(["text contains url", text.includes("httpbin.org")]);

  const postRes = await fetch("https://httpbin.org/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hello: "ekko" }),
  });
  c.push(["POST status 200", postRes.status === 200]);
  const postBody = await postRes.json();
  c.push(["POST json parsed", typeof postBody === "object"]);
  c.push(["POST data received", postBody.data && postBody.data.includes("ekko")]);

  c.push(["globalThis.fetch", typeof globalThis.fetch === "function"]);

  c.push(["createServer exists", typeof createServer === "function"]);

  let p = 0, f = 0;
  for (const [n, ok] of c) {
    if (ok) { p++; console.log("  PASS:", n); }
    else { f++; console.log("  FAIL:", n); }
  }
  console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
})();
