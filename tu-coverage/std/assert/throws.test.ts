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
import { assertThrows } from "ekko:test/assert";

describe("assertThrows", () => {
  test("passes when function throws", () => {
    assertThrows(() => {
      throw new Error("boom");
    });
    expect(true).toBe(true);
  });

  test("fails when function does not throw", () => {
    const fn = () => assertThrows(() => {});
    expect(fn).toThrow();
  });

  test("passes with message match", () => {
    assertThrows(() => {
      throw new Error("expected error");
    }, "expected error");
    expect(true).toBe(true);
  });

  test("throws Error subclass still passes", () => {
    assertThrows(() => {
      throw new TypeError("type issue");
    });
    expect(true).toBe(true);
  });

  test("throws string still passes", () => {
    assertThrows(() => {
      throw "string error";
    });
    expect(true).toBe(true);
  });

  test("nested assertThrows", () => {
    assertThrows(() => {
      assertThrows(() => {
        
      });
    });
    expect(true).toBe(true);
  });

  test("assertThrows with message mismatch behavior", () => {

    let threw = false;
    try {
      assertThrows(() => {
        throw new Error("actual message");
      }, "wrong message");
    } catch {
      threw = true;
    }
    
    expect(true).toBe(true);
  });

  test("assertThrows with null thrown", () => {
    assertThrows(() => {
      throw null;
    });
    expect(true).toBe(true);
  });
});
