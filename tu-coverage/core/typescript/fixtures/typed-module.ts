// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export interface User {
  name: string;
  age: number;
}

export type Status = "active" | "inactive" | "pending";

export type Pair<A, B> = {
  first: A;
  second: B;
};

export function greet(user: User): string {
  return `Hello, ${user.name}!`;
}

export function getStatus(): Status {
  return "active";
}

export function identity<T>(value: T): T {
  return value;
}

export function makePair<A, B>(a: A, b: B): Pair<A, B> {
  return { first: a, second: b };
}

export function add(a: number, b: number): number {
  return a + b;
}

export function optionalParam(x: number, y?: number): number {
  return y !== undefined ? x + y : x;
}

export const VERSION: string = "1.0.0";
