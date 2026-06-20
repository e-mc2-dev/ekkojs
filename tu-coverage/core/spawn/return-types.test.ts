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

describe("spawn return types - edge-case primitives", () => {
  test("spawn returning 0 (falsy number)", async () => {
    const result = await Ekko.spawn(() => 0);
    expect(result).toBe(0);
  });

  test("spawn returning empty string", async () => {
    const result = await Ekko.spawn(() => "");
    expect(result).toBe("");
  });

  test("spawn returning negative number", async () => {
    const result = await Ekko.spawn(() => -42);
    expect(result).toBe(-42);
  });

  test("spawn returning float (3.14)", async () => {
    const result = await Ekko.spawn(() => 3.14);
    expect(result).toBe(3.14);
  });

  test("spawn returning numeric string '42'", async () => {
    const result = await Ekko.spawn(() => "42");
    expect(result).toBe("42");
  });

  test("spawn returning Date.now() (large number)", async () => {
    const result = await Ekko.spawn(() => {
      const now = Date.now();
      return now;
    });
    expect(result > 1000000000000).toBe(true);
    expect(typeof result).toBe("number");
  });
});

describe("spawn return types - empty collections", () => {
  test("spawn returning empty array []", async () => {
    const result = await Ekko.spawn(() => []);
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  test("spawn returning empty object {}", async () => {
    const result = await Ekko.spawn(() => ({}));
    expect(result).toEqual({});
  });
});

describe("spawn return types - complex structures", () => {
  test("spawn returning deeply nested object", async () => {
    const result = await Ekko.spawn(() => ({
      a: { b: { c: { d: { e: "deep" } } } },
    }));
    expect(result.a.b.c.d.e).toBe("deep");
  });

  test("spawn returning array of objects", async () => {
    const result = await Ekko.spawn(() => [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ]);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Alice");
    expect(result[2].id).toBe(3);
  });

  test("spawn returning array with mixed types [1, 'two', true, null]", async () => {
    const result = await Ekko.spawn(() => [1, "two", true, null]);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe("two");
    expect(result[2]).toBe(true);
    expect(result[3]).toBeNull();
  });

  test("spawn returning Map-like object", async () => {
    const result = await Ekko.spawn(() => ({
      entries: [["a", 1], ["b", 2], ["c", 3]],
      size: 3,
    }));
    expect(result.size).toBe(3);
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0]).toEqual(["a", 1]);
  });
});

describe("spawn return types - strings", () => {
  test("spawn returning very long string (10000 chars)", async () => {
    const result = await Ekko.spawn(() => {
      let s = "";
      for (let i = 0; i < 10000; i++) {
        s += "x";
      }
      return s;
    });
    expect(result).toHaveLength(10000);
    expect(result[0]).toBe("x");
    expect(result[9999]).toBe("x");
  });

  test("spawn returning special chars in string", async () => {
    const result = await Ekko.spawn(() => "hello\nworld\ttab\"quote\\back");
    expect(result).toContain("hello");
    expect(result).toContain("world");
    expect(result).toContain("tab");
    expect(result).toContain("quote");
    expect(result).toContain("back");
  });
});

describe("spawn return types - computation", () => {
  test("spawn computation result (fibonacci)", async () => {
    const result = await Ekko.spawn(() => {
      function fib(n: number): number {
        if (n <= 1) return n;
        let a = 0, b = 1;
        for (let i = 2; i <= n; i++) {
          const tmp = a + b;
          a = b;
          b = tmp;
        }
        return b;
      }
      return fib(20);
    });
    expect(result).toBe(6765);
  });
});
