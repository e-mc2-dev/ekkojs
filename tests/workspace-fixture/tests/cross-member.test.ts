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
import { add, multiply } from "@test/math";
import { factorial, fibonacci } from "@test/math/advanced";

describe("workspace cross-member imports — multiple exports from same package", () => {
    test("use both main and subpath exports together", () => {
        const sum = add(factorial(3), fibonacci(5));
        
        expect(sum).toBe(11);
    });

    test("compose functions from different export paths", () => {
        const result = multiply(factorial(4), add(1, 1));
        
        expect(result).toBe(48);
    });

    test("all imports are functions", () => {
        expect(typeof add).toBe("function");
        expect(typeof multiply).toBe("function");
        expect(typeof factorial).toBe("function");
        expect(typeof fibonacci).toBe("function");
    });
});
