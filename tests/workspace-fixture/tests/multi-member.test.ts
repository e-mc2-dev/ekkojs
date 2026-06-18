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
import { add } from "@test/math";
import { repeat, reverse, truncate, padLeft } from "@test/strings";
import { camelCase, snakeCase, capitalize, kebabCase } from "@test/strings/case";

describe("workspace multiple members — @test/strings main export", () => {
    test("repeat", () => {
        expect(repeat("ab", 3)).toBe("ababab");
    });

    test("repeat zero times", () => {
        expect(repeat("x", 0)).toBe("");
    });

    test("reverse", () => {
        expect(reverse("hello")).toBe("olleh");
    });

    test("reverse empty", () => {
        expect(reverse("")).toBe("");
    });

    test("truncate short string unchanged", () => {
        expect(truncate("hi", 10)).toBe("hi");
    });

    test("truncate long string", () => {
        expect(truncate("hello world", 8)).toBe("hello...");
    });

    test("padLeft", () => {
        expect(padLeft("42", 5, "0")).toBe("00042");
    });

    test("padLeft already long enough", () => {
        expect(padLeft("hello", 3)).toBe("hello");
    });
});

describe("workspace multiple members — @test/strings/case subpath", () => {
    test("camelCase from snake", () => {
        expect(camelCase("hello_world")).toBe("helloWorld");
    });

    test("camelCase from kebab", () => {
        expect(camelCase("my-component")).toBe("myComponent");
    });

    test("snakeCase", () => {
        expect(snakeCase("helloWorld")).toBe("hello_world");
    });

    test("capitalize", () => {
        expect(capitalize("hello")).toBe("Hello");
    });

    test("capitalize empty", () => {
        expect(capitalize("")).toBe("");
    });

    test("kebabCase", () => {
        expect(kebabCase("helloWorld")).toBe("hello-world");
    });
});

describe("workspace cross-package composition", () => {
    test("combine math and strings", () => {
        const n = add(3, 4);
        const s = repeat("*", n);
        expect(s).toBe("*******");
    });

    test("pad number result", () => {
        const result = add(7, 35);
        expect(padLeft(String(result), 5, "0")).toBe("00042");
    });
});
