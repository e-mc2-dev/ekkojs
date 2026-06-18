// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export function capitalize(s: string): string {
  if (!s) return "";
  return s[0].toUpperCase() + s.slice(1);
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  if (maxLen <= 3) return s.slice(0, maxLen);
  return s.slice(0, maxLen - 3) + "...";
}

export function pad(s: string, len: number, ch: string): string {
  while (s.length < len) {
    s = ch + s;
  }
  return s;
}
