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
import { name, version, greet, identity } from "test-vfs-pkg";

describe("VFS package import — main export", () => {
    test("package name constant", () => {
        expect(name).toBe("test-vfs-pkg");
    });

    test("package version constant", () => {
        expect(version).toBe("2.0.0");
    });

    test("greet function", () => {
        expect(greet("World")).toBe("Hello, World!");
    });

    test("greet with empty", () => {
        expect(greet("")).toBe("Hello, !");
    });

    test("identity returns same value", () => {
        expect(identity(42)).toBe(42);
        expect(identity("hello")).toBe("hello");
    });
});
