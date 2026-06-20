// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export function camelCase(s: string): string {
    return s.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
}

export function snakeCase(s: string): string {
    return s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()).replace(/^_/, "");
}

export function capitalize(s: string): string {
    if (s.length === 0) return s;
    return s[0].toUpperCase() + s.slice(1);
}

export function kebabCase(s: string): string {
    return s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()).replace(/^-/, "");
}
