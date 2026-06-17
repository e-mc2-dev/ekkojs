// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export function Image({ src }: { src: string }) {
    return <img src={src} />;
}
export function Break() {
    return <br />;
}
export function Input({ type }: { type: string }) {
    return <input type={type} />;
}
