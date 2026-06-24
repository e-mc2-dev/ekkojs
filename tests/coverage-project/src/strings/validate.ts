// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export function isEmail(s: string): boolean {
  if (!s || s.length === 0) return false;
  if (!s.includes("@")) return false;
  const parts = s.split("@");
  if (parts.length !== 2) return false;
  if (parts[0].length === 0 || parts[1].length === 0) return false;
  if (!parts[1].includes(".")) return false;
  return true;
}

export function isUrl(s: string): boolean {
  if (!s) return false;
  if (s.startsWith("http://") || s.startsWith("https://")) return true;
  return false;
}

export function isNumeric(s: string): boolean {
  if (!s || s.length === 0) return false;
  for (const ch of s) {
    if (ch < "0" || ch > "9") {
      if (ch !== "." && ch !== "-") return false;
    }
  }
  return true;
}

export function isAlpha(s: string): boolean {
  if (!s || s.length === 0) return false;
  for (const ch of s) {
    const c = ch.toLowerCase();
    if (c < "a" || c > "z") return false;
  }
  return true;
}
