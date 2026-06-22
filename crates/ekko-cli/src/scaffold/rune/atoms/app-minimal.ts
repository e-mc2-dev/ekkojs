// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { atom } from "ekko:rune/mimir";

export const serverInfoAtom = atom({
  key: "app:server",
  default: { renderedAt: "", runtime: "EkkoJS" },
});

export const counterAtom = atom({ key: "app:counter", default: 0, persist: true });
