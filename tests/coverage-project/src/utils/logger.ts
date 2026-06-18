// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel: LogLevel = "info";

export function setLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLevel(): LogLevel {
  return currentLevel;
}

export function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[currentLevel];
}

export function formatMessage(level: LogLevel, msg: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${msg}`;
}

export function debug(msg: string): void {
  if (shouldLog("debug")) console.log(formatMessage("debug", msg));
}

export function info(msg: string): void {
  if (shouldLog("info")) console.log(formatMessage("info", msg));
}

export function warn(msg: string): void {
  if (shouldLog("warn")) console.log(formatMessage("warn", msg));
}

export function error(msg: string): void {
  if (shouldLog("error")) console.log(formatMessage("error", msg));
}
