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

describe("Ekko.parallel - error handling", () => {
  test("one function throws, entire parallel fails", async () => {
    let caught = false;
    try {
      await Ekko.parallel([
        () => 1,
        () => { throw new Error("fail"); },
        () => 3,
      ]);
    } catch {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("error message from failing function is preserved", async () => {
    let caught = false;
    try {
      await Ekko.parallel([
        () => 1,
        () => { throw new Error("specific error"); },
      ]);
    } catch (e: any) {
      caught = true;
      expect(String(e).includes("specific error")).toBe(true);
    }
    expect(caught).toBe(true);
  });

  test("first function throws", async () => {
    let caught = false;
    try {
      await Ekko.parallel([
        () => { throw new Error("first fails"); },
        () => 2,
        () => 3,
      ]);
    } catch (e: any) {
      caught = true;
      expect(String(e).includes("first fails")).toBe(true);
    }
    expect(caught).toBe(true);
  });

  test("last function throws", async () => {
    let caught = false;
    try {
      await Ekko.parallel([
        () => 1,
        () => 2,
        () => { throw new Error("last fails"); },
      ]);
    } catch (e: any) {
      caught = true;
      expect(String(e).includes("last fails")).toBe(true);
    }
    expect(caught).toBe(true);
  });

  test("multiple functions throw — error from one is caught", async () => {
    let caught = false;
    try {
      await Ekko.parallel([
        () => { throw new Error("error A"); },
        () => { throw new Error("error B"); },
      ]);
    } catch (e: any) {
      caught = true;
      const msg = String(e);
      const hasA = msg.includes("error A");
      const hasB = msg.includes("error B");
      expect(hasA || hasB).toBeTruthy();
    }
    expect(caught).toBe(true);
  });

  test("throwing non-Error value is caught", async () => {
    let caught = false;
    try {
      await Ekko.parallel([
        () => { throw "string error"; },
      ]);
    } catch {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("async function that rejects", async () => {
    let caught = false;
    try {
      await Ekko.parallel([
        async () => { throw new Error("async reject"); },
      ]);
    } catch {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("error does not corrupt other parallel calls", async () => {
    try {
      await Ekko.parallel([() => { throw new Error("bad"); }]);
    } catch (_) {
      
    }
    const results = await Ekko.parallel([() => 1, () => 2]);
    expect(results).toEqual([1, 2]);
  });
});
