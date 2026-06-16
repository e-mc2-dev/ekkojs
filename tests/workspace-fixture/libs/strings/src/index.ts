// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export function repeat(s: string, n: number): string {
    let result = "";
    for (let i = 0; i < n; i++) result += s;
    return result;
}

export function reverse(s: string): string {
    let result = "";
    for (let i = s.length - 1; i >= 0; i--) result += s[i];
    return result;
}

export function truncate(s: string, maxLen: number): string {
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen - 3) + "...";
}

export function padLeft(s: string, len: number, ch: string = " "): string {
    while (s.length < len) s = ch + s;
    return s;
}
