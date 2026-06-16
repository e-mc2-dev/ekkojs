// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { addAll } from "./add.ts";

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return addAll(...arr) / arr.length;
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function min(arr: number[]): number {
  if (arr.length === 0) throw new Error("empty array");
  let m = arr[0];
  for (const v of arr) {
    if (v < m) m = v;
  }
  return m;
}

export function max(arr: number[]): number {
  if (arr.length === 0) throw new Error("empty array");
  let m = arr[0];
  for (const v of arr) {
    if (v > m) m = v;
  }
  return m;
}
