// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



export function neverCalled(): string {
  return "this code is dead";
}

export function alsoNeverCalled(x: number): number {
  if (x > 0) {
    return x * 2;
  } else if (x < 0) {
    return x * -1;
  }
  return 0;
}

export function deeplyDead(): void {
  const items = [1, 2, 3, 4, 5];
  for (const item of items) {
    if (item % 2 === 0) {
      console.log("even:", item);
    } else {
      console.log("odd:", item);
    }
  }
}
