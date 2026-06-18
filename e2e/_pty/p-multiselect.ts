// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { prompt } from "ekko:app/cli";
const r = await prompt.multiSelect("Choose:", ["alpha", "bravo", "charlie"]);
console.log("RESULT:" + r.join(","));
Ekko.exit(0);
