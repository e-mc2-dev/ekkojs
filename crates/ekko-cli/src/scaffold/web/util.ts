// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


export function greet(kind: string): string {
  return `A pure client-side ${kind} app, bundled to one ESM file by EkkoJS.`;
}

export function now(): string {
  return new Date().toLocaleTimeString();
}
