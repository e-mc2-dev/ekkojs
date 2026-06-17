// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { describe, test, expect } from "ekko:test";

describe("module resolution errors - non-existent modules", () => {
  test("dynamic import of non-existent file rejects", async () => {
    let caught = false;
    try {
      await import("./fixtures/does-not-exist.ts");
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("dynamic import of non-existent deeply nested path rejects", async () => {
    let caught = false;
    try {
      await import("./fixtures/a/b/c/missing.ts");
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("dynamic import of empty string rejects", async () => {
    let caught = false;
    try {
      await import("");
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });
});

describe("module resolution errors - bare specifiers", () => {
  test("bare specifier without ekko: prefix rejects", async () => {
    let caught = false;
    try {
      await import("nonexistent-package");
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("bare specifier 'fs' without prefix rejects", async () => {
    let caught = false;
    try {
      await import("fs");
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("bare specifier 'path' without prefix rejects", async () => {
    let caught = false;
    try {
      await import("path");
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });
});

describe("module resolution errors - invalid specifiers", () => {
  test("dynamic import of invalid ekko: module rejects", async () => {
    let caught = false;
    try {
      await import("ekko:nonexistent");
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("dynamic import of node: prefix rejects", async () => {
    let caught = false;
    try {
      await import("node:fs");
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("dynamic import error produces an error object", async () => {
    let error: unknown = null;
    try {
      await import("./fixtures/absolutely-missing.ts");
    } catch (e) {
      error = e;
    }
    expect(error).not.toBeNull();
  });

  
});
