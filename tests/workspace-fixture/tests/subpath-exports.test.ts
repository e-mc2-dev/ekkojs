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
import { factorial, fibonacci } from "@test/math/advanced";

describe("workspace member import — subpath exports", () => {
    test("factorial(0) = 1", () => {
        expect(factorial(0)).toBe(1);
    });

    test("factorial(1) = 1", () => {
        expect(factorial(1)).toBe(1);
    });

    test("factorial(5) = 120", () => {
        expect(factorial(5)).toBe(120);
    });

    test("factorial(10) = 3628800", () => {
        expect(factorial(10)).toBe(3628800);
    });

    test("fibonacci(0) = 0", () => {
        expect(fibonacci(0)).toBe(0);
    });

    test("fibonacci(1) = 1", () => {
        expect(fibonacci(1)).toBe(1);
    });

    test("fibonacci(10) = 55", () => {
        expect(fibonacci(10)).toBe(55);
    });

    test("fibonacci(20) = 6765", () => {
        expect(fibonacci(20)).toBe(6765);
    });
});
