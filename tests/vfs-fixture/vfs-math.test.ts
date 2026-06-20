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
import { square, cube, abs, max, min } from "test-vfs-pkg/math";

describe("VFS package import — subpath export (./math)", () => {
    test("square", () => {
        expect(square(5)).toBe(25);
        expect(square(0)).toBe(0);
        expect(square(-3)).toBe(9);
    });

    test("cube", () => {
        expect(cube(3)).toBe(27);
        expect(cube(2)).toBe(8);
    });

    test("abs positive unchanged", () => {
        expect(abs(42)).toBe(42);
    });

    test("abs negative", () => {
        expect(abs(-7)).toBe(7);
    });

    test("abs zero", () => {
        expect(abs(0)).toBe(0);
    });

    test("max", () => {
        expect(max(3, 7)).toBe(7);
        expect(max(10, 2)).toBe(10);
    });

    test("min", () => {
        expect(min(3, 7)).toBe(3);
        expect(min(10, 2)).toBe(2);
    });
});
