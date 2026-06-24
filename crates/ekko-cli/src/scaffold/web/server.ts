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
  
  .get("/api/hello", (_req, res) => {
    res.json({ message: "Hello from the EkkoJS API", time: new Date().toISOString() });
  })
  
  .static("/", "dist", { spa: true })
  .start();

console.log(`Web app + API on http://localhost:${port}`);
