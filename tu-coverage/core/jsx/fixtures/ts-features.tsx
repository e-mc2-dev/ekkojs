// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

interface User { name: string; age: number }
type Status = "active" | "inactive";
export function getUser(): User { return { name: "Alice", age: 30 }; }
export function getStatus(): Status { return "active"; }
export const tuple: [string, number] = ["hello", 42];
export function generic<T>(val: T): T { return val; }
export function optional(x?: number): number { return x ?? 0; }
export const WithJSX = () => <div>TS + JSX</div>;
