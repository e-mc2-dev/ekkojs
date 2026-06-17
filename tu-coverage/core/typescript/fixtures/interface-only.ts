// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export interface Config {
  host: string;
  port: number;
  debug: boolean;
}

export interface Logger {
  log(message: string): void;
  error(message: string): void;
}

export type LogLevel = "info" | "warn" | "error" | "debug";

export type Nullable<T> = T | null;

export const DEFAULT_PORT: number = 8080;
