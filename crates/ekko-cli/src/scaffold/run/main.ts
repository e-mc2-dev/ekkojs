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

const server = createServer({ port: 3000 });

server.get("/", (req, res) => {
  res.json({ message: "Hello from EkkoJS!" });
});

server.start();
console.log("Listening on http://localhost:3000");
