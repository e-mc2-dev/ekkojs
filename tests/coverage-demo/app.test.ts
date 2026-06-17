// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { test, expect, describe } from "ekko:test";
import { json } from "ekko:text/json";
import { gzip } from "ekko:compress";

function add(a: number, b: number): number {
  return a + b;
}

function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("division by zero");
  }
  return a / b;
}

function classify(score: number): string {
  if (score >= 90) {
    return "A";
  } else if (score >= 80) {
    return "B";
  } else if (score >= 70) {
    return "C";
  } else {
    return "F";
  }
}

function processItems(items: any[]): { total: number; valid: number } {
  let total = 0;
  let valid = 0;
  for (const item of items) {
    total++;
    if (item === null || item === undefined) {
      continue;
    }
    if (typeof item === "number" && item > 0) {
      valid++;
    }
  }
  return { total, valid };
}

function unusedFunction(): string {
  const x = "this code is never called";
  return x.toUpperCase();
}

class Calculator {
  history = [];

  add(a, b) {
    const result = a + b;
    this.history.push(result);
    return result;
  }

  getHistory() {
    return this.history.slice();
  }

  clear() {
    this.history = [];
  }
}

describe("math", () => {
  test("addition", () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
  });

  test("division", () => {
    expect(divide(10, 2)).toBe(5);
    expect(divide(9, 3)).toBe(3);
  });

  test("division by zero throws", () => {
    expect(() => divide(1, 0)).toThrow("division by zero");
  });
});

describe("classify", () => {
  test("A grade", () => {
    expect(classify(95)).toBe("A");
    expect(classify(90)).toBe("A");
  });

  test("B grade", () => {
    expect(classify(85)).toBe("B");
  });

  

  test("F grade", () => {
    expect(classify(50)).toBe("F");
  });
});

describe("processItems", () => {
  test("mixed items", () => {
    const result = processItems([1, null, -5, 3, undefined, 0, 10]);
    expect(result.total).toBe(7);
    expect(result.valid).toBe(3);
  });
});

describe("Calculator class", () => {
  test("add and history", () => {
    const calc = new Calculator();
    calc.add(1, 2);
    calc.add(3, 4);
    expect(calc.getHistory()).toEqual([3, 7]);
  });

});

describe("json integration", () => {
  test("parse and stringify", () => {
    const obj = json.parse('{"name":"test","value":42}');
    expect(obj.name).toBe("test");
    const str = json.stringify(obj);
    expect(str).toContain("test");
  });
});

describe("compress integration", () => {
  test("gzip roundtrip", () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]);
    const compressed = gzip.compress(data);
    const decompressed = gzip.decompress(compressed);
    expect(decompressed.length).toBe(5);
  });
});
