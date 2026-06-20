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
import { add, multiply, PI } from "@test/math";

describe("workspace member import — main export", () => {
    test("import named export: add function", () => {
        expect(add(2, 3)).toBe(5);
    });

    test("import named export: multiply function", () => {
        expect(multiply(4, 5)).toBe(20);
    });

    test("import named export: PI constant", () => {
        expect(PI).toBe(3.14159);
    });

    test("add with negative numbers", () => {
        expect(add(-1, -2)).toBe(-3);
    });

    test("add with zero", () => {
        expect(add(0, 0)).toBe(0);
    });

    test("multiply with zero", () => {
        expect(multiply(100, 0)).toBe(0);
    });

    test("multiply negative", () => {
        expect(multiply(-3, 7)).toBe(-21);
    });
});
