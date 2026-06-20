// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


import { greet } from "./util";

const app = document.getElementById("app")!;
app.innerHTML = `
  <section class="hero">
    <h1>EkkoJS <span class="grad">web + API</span></h1>
    <p class="tag">${greet("api")}</p>
    <pre id="out">fetching /api/hello…</pre>
  </section>
`;

try {
  const res = await fetch("/api/hello");
  const data = await res.json();
  document.getElementById("out")!.textContent = JSON.stringify(data, null, 2);
} catch (err) {
  document.getElementById("out")!.textContent = `API error: ${String(err)}`;
}
