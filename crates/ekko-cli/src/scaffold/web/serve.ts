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

const port = 3000;

createServer({ port })
  
  .static("/", "dist", { spa: true })
  .start();

console.log(`Static web app on http://localhost:${port}`);
