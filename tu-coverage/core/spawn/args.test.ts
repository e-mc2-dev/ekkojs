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

describe("spawn args - positional array syntax", () => {
  test("spawn with two number args using array", async () => {
    const result = await Ekko.spawn((a: number, b: number) => a + b, [1, 2]);
    expect(result).toBe(3);
  });

  test("spawn with string args using array", async () => {
    const result = await Ekko.spawn(
      (a: string, b: string) => a + b,
      ["hello", " world"],
    );
    expect(result).toBe("hello world");
  });

  test("spawn with single arg using array", async () => {
    const result = await Ekko.spawn((x: number) => x * 2, [5]);
    expect(result).toBe(10);
  });
});

describe("spawn args - options object syntax", () => {
  test("spawn with args in options object", async () => {
    const result = await Ekko.spawn(
      (a: number, b: number) => a + b,
      { args: [10, 20] },
    );
    expect(result).toBe(30);
  });

  test("spawn with empty args array in options", async () => {
    const result = await Ekko.spawn(() => "no args", { args: [], timeout: 5000 });
    expect(result).toBe("no args");
  });
});

describe("spawn args - edge cases", () => {
  test("spawn with no args and no options", async () => {
    const result = await Ekko.spawn(() => "standalone");
    expect(result).toBe("standalone");
  });

  test("spawn with object arg", async () => {
    const result = await Ekko.spawn(
      (obj: { x: number }) => obj.x * 3,
      [{ x: 7 }],
    );
    expect(result).toBe(21);
  });

  test("spawn with array arg", async () => {
    const result = await Ekko.spawn(
      (arr: number[]) => arr.reduce((a, b) => a + b, 0),
      [[1, 2, 3, 4]],
    );
    expect(result).toBe(10);
  });

  test("spawn with many args (5+)", async () => {
    const result = await Ekko.spawn(
      (a: number, b: number, c: number, d: number, e: number) =>
        a + b + c + d + e,
      [1, 2, 3, 4, 5],
    );
    expect(result).toBe(15);
  });

  test("spawn with null arg", async () => {
    const result = await Ekko.spawn((val: null) => val === null, [null]);
    expect(result).toBe(true);
  });

  test("spawn with undefined arg", async () => {
    const result = await Ekko.spawn(
      (val: any) => val == null,
      [undefined],
    );
    expect(result).toBe(true);
  });
});
