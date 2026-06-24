// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export function add(a: number, b: number): number {
  return a + b;
}

export function addAll(...nums: number[]): number {
  let total = 0;
  for (const n of nums) {
    total += n;
  }
  return total;
}
