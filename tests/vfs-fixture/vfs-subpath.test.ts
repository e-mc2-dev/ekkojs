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
import { uppercase, lowercase, trim, contains } from "test-vfs-pkg/utils";

describe("VFS package import — subpath export (./utils)", () => {
    test("uppercase", () => {
        expect(uppercase("hello")).toBe("HELLO");
    });

    test("lowercase", () => {
        expect(lowercase("WORLD")).toBe("world");
    });

    test("trim", () => {
        expect(trim("  hi  ")).toBe("hi");
    });

    test("trim no-op", () => {
        expect(trim("clean")).toBe("clean");
    });

    test("contains true", () => {
        expect(contains("hello world", "world")).toBe(true);
    });

    test("contains false", () => {
        expect(contains("hello world", "xyz")).toBe(false);
    });
});
