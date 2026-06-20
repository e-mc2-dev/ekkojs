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
import { clampedAdd } from "@test/math/advanced";
import { clamp, lerp } from "@test/math/helpers";

describe("relative imports within workspace member", () => {
    test("clampedAdd uses internal ./helpers.ts import", () => {
        
        expect(clampedAdd(5, 10, 0, 12)).toBe(12);
    });

    test("clampedAdd within range", () => {
        expect(clampedAdd(3, 4, 0, 100)).toBe(7);
    });

    test("clampedAdd below min", () => {
        expect(clampedAdd(-10, -5, 0, 100)).toBe(0);
    });

    test("direct import of helpers subpath", () => {
        expect(clamp(50, 0, 100)).toBe(50);
        expect(clamp(-5, 0, 100)).toBe(0);
        expect(clamp(150, 0, 100)).toBe(100);
    });

    test("lerp interpolation", () => {
        expect(lerp(0, 10, 0.5)).toBe(5);
        expect(lerp(0, 10, 0)).toBe(0);
        expect(lerp(0, 10, 1)).toBe(10);
    });
});
