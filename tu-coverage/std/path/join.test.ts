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
import { join, sep } from "ekko:fs/path";

describe("join", () => {
  test("join two segments", () => {
    const result = join("a", "b");
    expect(result).toContain("a");
    expect(result).toContain("b");
    expect(result).toBe("a" + sep + "b");
  });

  test("join three segments", () => {
    const result = join("a", "b", "c");
    const parts = result.split(sep);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("a");
    expect(parts[1]).toBe("b");
    expect(parts[2]).toBe("c");
  });

  test("join with empty string collapses", () => {
    const result = join("a", "", "b");
    expect(result).toContain("a");
    expect(result).toContain("b");
  });

  test("join single segment returns that segment", () => {
    const result = join("only");
    expect(result).toBe("only");
  });

  test("join with trailing separator is normalized", () => {
    const result = join("a" + sep, "b");
    expect(result).toBe("a" + sep + "b");
  });

  test("join with current directory dot", () => {
    const result = join(".", "file.ts");
    expect(result).toContain("file.ts");
  });

  test("join with parent directory double-dot", () => {
    const result = join("a", "b", "..", "c");
    expect(result).toContain("a");
    expect(result).toContain("c");
  });

  test("join result does not have double separators", () => {
    const result = join("a", "b");
    const doubleSep = sep + sep;
    expect(result).not.toContain(doubleSep);
  });
});
