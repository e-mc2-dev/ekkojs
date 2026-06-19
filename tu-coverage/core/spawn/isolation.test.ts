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

describe("spawn isolation - globalThis modifications", () => {
  test("worker globalThis changes do not affect parent", async () => {
    await Ekko.spawn(() => {
      (globalThis as any).__workerMark = true;
    });
    expect((globalThis as any).__workerMark == null).toBe(true);
  });

  test("parent globalThis changes do not affect worker", async () => {
    (globalThis as any).__parentMark = "parent";
    const result = await Ekko.spawn(() => {
      return (globalThis as any).__parentMark;
    });
    expect(result == null).toBe(true);
    delete (globalThis as any).__parentMark;
  });
});

describe("spawn isolation - worker has its own Ekko object", () => {
  test("worker can access Ekko.version", async () => {
    const result = await Ekko.spawn(() => {
      return typeof Ekko.version;
    });
    expect(result).toBe("string");
  });

  test("worker can access Ekko.platform", async () => {
    const result = await Ekko.spawn(() => {
      return Ekko.platform;
    });
    expect(typeof result).toBe("string");
    expect(result).toBe(Ekko.platform);
  });

  test("worker can access Ekko.arch", async () => {
    const result = await Ekko.spawn(() => {
      return Ekko.arch;
    });
    expect(typeof result).toBe("string");
    expect(result).toBe(Ekko.arch);
  });
});

describe("spawn isolation - worker built-in APIs", () => {
  test("worker can use setTimeout", async () => {
    const result = await Ekko.spawn(() => {
      return new Promise<number>((resolve) => {
        setTimeout(() => resolve(123), 5);
      });
    });
    expect(result).toBe(123);
  });

  test("worker can use console.log without error", async () => {
    
    const result = await Ekko.spawn(() => {
      console.log("worker log message");
      return "logged";
    });
    expect(result).toBe("logged");
  });

  test("worker can use performance.now", async () => {
    const result = await Ekko.spawn(() => {
      const start = performance.now();
      let x = 0;
      for (let i = 0; i < 100; i++) x += i;
      const elapsed = performance.now() - start;
      return elapsed >= 0;
    });
    expect(result).toBe(true);
  });

  test("two workers are isolated from each other", async () => {
    await Ekko.spawn(() => {
      (globalThis as any).__sharedState = "worker1";
    });
    const result = await Ekko.spawn(() => {
      return (globalThis as any).__sharedState;
    });
    expect(result == null).toBe(true);
  });
});
