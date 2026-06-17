// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export function multiply(a: number, b: number): number {
  return a * b;
}

export function power(base: number, exp: number): number {
  if (exp === 0) return 1;
  if (exp < 0) return 1 / power(base, -exp);
  let result = 1;
  for (let i = 0; i < exp; i++) {
    result *= base;
  }
  return result;
}

export function factorial(n: number): number {
  if (n < 0) throw new Error("negative factorial");
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
