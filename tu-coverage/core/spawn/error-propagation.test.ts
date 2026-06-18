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

describe("spawn error propagation - Error objects", () => {
  test("spawn that throws Error is caught as SpawnError", async () => {
    let caught = false;
    let errorName = "";
    try {
      await Ekko.spawn(() => {
        throw new Error("worker failed");
      });
    } catch (e: any) {
      caught = true;
      errorName = e.name;
    }
    expect(caught).toBe(true);
    expect(errorName).toBe("SpawnError");
  });

  test("spawn error preserves the original message", async () => {
    let message = "";
    try {
      await Ekko.spawn(() => {
        throw new Error("specific failure reason");
      });
    } catch (e: any) {
      message = e.message;
    }
    expect(message).toContain("specific failure reason");
  });

  test("spawn error has a cause property", async () => {
    let hasCause = false;
    try {
      await Ekko.spawn(() => {
        throw new Error("cause test");
      });
    } catch (e: any) {
      hasCause = e.cause !== undefined && e.cause !== null;
    }
    expect(hasCause).toBe(true);
  });

  test("spawn error cause is an object", async () => {
    let causeType = "";
    try {
      await Ekko.spawn(() => {
        throw new Error("type test");
      });
    } catch (e: any) {
      causeType = typeof e.cause;
    }
    expect(causeType).toBe("object");
  });

  test("spawn error stack includes spawned-from marker", async () => {
    let stack = "";
    try {
      await Ekko.spawn(() => {
        throw new Error("stack test");
      });
    } catch (e: any) {
      stack = e.stack || "";
    }
    expect(stack).toContain("--- spawned from ---");
  });
});

describe("spawn error propagation - non-Error throws", () => {
  test("spawn that throws a string", async () => {
    let caught = false;
    try {
      await Ekko.spawn(() => {
        throw "string error";
      });
    } catch (e: any) {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("spawn that throws a number", async () => {
    let caught = false;
    try {
      await Ekko.spawn(() => {
        throw 404;
      });
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });
});

describe("spawn error propagation - typed errors", () => {
  test("spawn that throws TypeError", async () => {
    let message = "";
    try {
      await Ekko.spawn(() => {
        throw new TypeError("type mismatch");
      });
    } catch (e: any) {
      message = e.message;
    }
    expect(message).toContain("type mismatch");
  });

  test("spawn that throws RangeError", async () => {
    let message = "";
    try {
      await Ekko.spawn(() => {
        throw new RangeError("out of range");
      });
    } catch (e: any) {
      message = e.message;
    }
    expect(message).toContain("out of range");
  });

  test("spawn runtime error (accessing property of undefined)", async () => {
    let caught = false;
    try {
      await Ekko.spawn(() => {
        const obj: any = undefined;
        return obj.property;
      });
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  test("spawn error name is consistently SpawnError", async () => {
    const errors: string[] = [];
    for (const thrower of [
      () => { throw new Error("a"); },
      () => { throw new TypeError("b"); },
      () => { throw new RangeError("c"); },
    ]) {
      try {
        await Ekko.spawn(thrower);
      } catch (e: any) {
        errors.push(e.name);
      }
    }
    expect(errors).toHaveLength(3);
    for (const name of errors) {
      expect(name).toBe("SpawnError");
    }
  });
});
