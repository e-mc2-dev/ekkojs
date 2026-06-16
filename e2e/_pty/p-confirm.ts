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
const r = await prompt.confirm("Proceed?");
console.log("RESULT:" + (r ? "yes" : "no"));
Ekko.exit(0);
