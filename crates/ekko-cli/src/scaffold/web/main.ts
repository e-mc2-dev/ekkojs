// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


import { greet, now } from "./util";

const app = document.getElementById("app")!;
app.innerHTML = `
  <section class="hero">
    <h1>EkkoJS <span class="grad">web</span></h1>
    <p class="tag">${greet("static")}</p>
    <button id="count">Clicked 0 times</button>
    <p class="muted">started at ${now()}</p>
  </section>
`;

let n = 0;
const btn = document.getElementById("count")!;
btn.addEventListener("click", () => {
  n += 1;
  btn.textContent = `Clicked ${n} time${n === 1 ? "" : "s"}`;
});
