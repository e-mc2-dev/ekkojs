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
import { serializeProps } from "ekko:ssr";

describe("serializeProps", () => {
  test("serializeProps is a function", () => {
    expect(typeof serializeProps).toBe("function");
  });

  test("null passes through", () => {
    expect(serializeProps(null)).toBe(null);
  });

  test("undefined returns undefined", () => {
    expect(serializeProps(undefined)).toBe(undefined);
  });

  test("strings pass through", () => {
    expect(serializeProps("hello")).toBe("hello");
  });

  test("numbers pass through", () => {
    expect(serializeProps(42)).toBe(42);
    expect(serializeProps(0)).toBe(0);
    expect(serializeProps(-3.14)).toBe(-3.14);
  });

  test("booleans pass through", () => {
    expect(serializeProps(true)).toBe(true);
    expect(serializeProps(false)).toBe(false);
  });

  test("plain objects serialize", () => {
    const result = serializeProps({ name: "Alice", age: 30 });
    expect(result.name).toBe("Alice");
    expect(result.age).toBe(30);
  });

  test("arrays serialize", () => {
    const result = serializeProps([1, "two", true]);
    expect(result.length).toBe(3);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe("two");
    expect(result[2]).toBe(true);
  });

  test("nested objects serialize", () => {
    const result = serializeProps({ user: { name: "Bob", scores: [10, 20] } });
    expect(result.user.name).toBe("Bob");
    expect(result.user.scores[0]).toBe(10);
    expect(result.user.scores[1]).toBe(20);
  });

  test("Date converts to ISO string", () => {
    const date = new Date("2026-01-15T10:30:00.000Z");
    const result = serializeProps(date);
    expect(result).toBe("2026-01-15T10:30:00.000Z");
  });

  test("Date in object converts to ISO string", () => {
    const result = serializeProps({ createdAt: new Date("2026-06-01T00:00:00.000Z") });
    expect(result.createdAt).toBe("2026-06-01T00:00:00.000Z");
  });

  test("null values in objects preserved", () => {
    const result = serializeProps({ name: "Alice", avatar: null });
    expect(result.name).toBe("Alice");
    expect(result.avatar).toBe(null);
  });

  test("undefined values in objects are stripped", () => {
    const result = serializeProps({ name: "Alice", age: undefined });
    expect(result.name).toBe("Alice");
    expect(result.age).toBe(undefined);
    expect(Object.keys(result).includes("age")).toBe(false);
  });

  test("throws on function values", () => {
    let threw = false;
    try {
      serializeProps({ onClick: () => {} });
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("function")).toBe(true);
      expect(e.message.includes("onClick")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("throws on symbol values", () => {
    let threw = false;
    try {
      serializeProps({ id: Symbol("test") });
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("Symbol")).toBe(true);
      expect(e.message.includes("id")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("throws on circular reference", () => {
    const obj: any = { name: "test" };
    obj.self = obj;
    let threw = false;
    try {
      serializeProps(obj);
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("circular")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("throws on NaN", () => {
    let threw = false;
    try {
      serializeProps({ value: NaN });
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("NaN")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("throws on Infinity", () => {
    let threw = false;
    try {
      serializeProps({ value: Infinity });
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("Infinity")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("throws on negative Infinity", () => {
    let threw = false;
    try {
      serializeProps({ value: -Infinity });
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("Infinity")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("throws on RegExp", () => {
    let threw = false;
    try {
      serializeProps({ pattern: /test/g });
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("RegExp")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("throws on Invalid Date", () => {
    let threw = false;
    try {
      serializeProps({ d: new Date("not-a-date") });
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("Invalid Date")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("deeply nested function throws with path", () => {
    let threw = false;
    try {
      serializeProps({ a: { b: { c: () => {} } } });
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("a.b.c")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("function in array throws with path", () => {
    let threw = false;
    try {
      serializeProps({ items: [1, () => {}, 3] });
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("items[1]")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("result is JSON-safe (roundtrips through JSON.stringify/parse)", () => {
    const input = {
      name: "Alice",
      age: 30,
      active: true,
      scores: [100, 95, 87],
      createdAt: new Date("2026-03-15T12:00:00.000Z"),
      meta: { role: "admin", perms: ["read", "write"] },
    };
    const serialized = serializeProps(input);
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("Alice");
    expect(parsed.age).toBe(30);
    expect(parsed.active).toBe(true);
    expect(parsed.scores[2]).toBe(87);
    expect(parsed.createdAt).toBe("2026-03-15T12:00:00.000Z");
    expect(parsed.meta.role).toBe("admin");
    expect(parsed.meta.perms[1]).toBe("write");
  });

  test("empty object passes through", () => {
    const result = serializeProps({});
    expect(Object.keys(result).length).toBe(0);
  });

  test("empty array passes through", () => {
    const result = serializeProps([]);
    expect(result.length).toBe(0);
  });
});
