// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { clamp } from "./utils.ts";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAge(age: number): ValidationResult {
  const errors: string[] = [];

  if (typeof age !== "number") {
    errors.push("age must be a number");
    return { valid: false, errors };
  }

  if (age < 0) {
    errors.push("age cannot be negative");
  } else if (age > 150) {
    errors.push("age cannot exceed 150");
  }

  const clamped = clamp(age, 0, 150);
  if (clamped !== age) {
    errors.push("age was clamped to valid range");
  }

  return { valid: errors.length === 0, errors };
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || email.length === 0) {
    errors.push("email is required");
    return { valid: false, errors };
  }

  if (!email.includes("@")) {
    errors.push("email must contain @");
  }

  if (!email.includes(".")) {
    errors.push("email must contain a domain");
  }

  if (email.length > 254) {
    errors.push("email too long");
  }

  return { valid: errors.length === 0, errors };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("password must be at least 8 characters");
  }

  if (password.length > 128) {
    errors.push("password must be at most 128 characters");
  }

  let hasUpper = false;
  let hasLower = false;
  let hasDigit = false;
  for (const ch of password) {
    if (ch >= "A" && ch <= "Z") hasUpper = true;
    if (ch >= "a" && ch <= "z") hasLower = true;
    if (ch >= "0" && ch <= "9") hasDigit = true;
  }

  if (!hasUpper) errors.push("must contain uppercase");
  if (!hasLower) errors.push("must contain lowercase");
  if (!hasDigit) errors.push("must contain digit");

  return { valid: errors.length === 0, errors };
}
