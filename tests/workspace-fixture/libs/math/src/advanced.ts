// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { clamp } from "./helpers";

export function factorial(n: number): number {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

export function fibonacci(n: number): number {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
        const t = a + b;
        a = b;
        b = t;
    }
    return b;
}

export function clampedAdd(a: number, b: number, min: number, max: number): number {
    return clamp(a + b, min, max);
}
