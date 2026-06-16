// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  } else if (value > max) {
    return max;
  }
  return value;
}

export function capitalize(str: string): string {
  if (!str || str.length === 0) {
    return "";
  }
  return str[0].toUpperCase() + str.slice(1);
}

export function sum(arr: number[]): number {
  let total = 0;
  for (const n of arr) {
    total += n;
  }
  return total;
}

export function average(arr: number[]): number {
  if (arr.length === 0) {
    return 0;
  }
  return sum(arr) / arr.length;
}

export function unusedHelper(): void {
  console.log("this is never called");
  console.log("dead code path 1");
  console.log("dead code path 2");
}
