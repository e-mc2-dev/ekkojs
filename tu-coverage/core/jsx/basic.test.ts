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
import { Greet, version } from "./fixtures/simple-component";
import { Layout } from "./fixtures/multi-element";
import { Card, cardType } from "./fixtures/pure-jsx";

describe("JSX basic compilation", () => {
  test("Greet is a function", () => {
    expect(typeof Greet).toBe("function");
  });

  test("version is 1 — TypeScript type stripped, value preserved", () => {
    expect(version).toBe(1);
  });

  test("Layout is a function", () => {
    expect(typeof Layout).toBe("function");
  });

  test("Card is a function imported from .jsx file", () => {
    expect(typeof Card).toBe("function");
  });

  test("cardType is 'basic' imported from .jsx file", () => {
    expect(cardType).toBe("basic");
  });

  test("Greet({name:'World'}) returns a value, not undefined", () => {
    const result = Greet({ name: "World" });
    expect(result).not.toBe(undefined);
  });

  test("Greet({name:'World'}) returns an object — the JSX result", () => {
    const result = Greet({ name: "World" });
    expect(typeof result).toBe("object");
  });

  test("Layout() returns a value", () => {
    const result = Layout();
    expect(result).not.toBe(undefined);
  });

  test("Layout() returns an object", () => {
    const result = Layout();
    expect(typeof result).toBe("object");
  });

  test("Card() returns a value from .jsx file", () => {
    const result = Card();
    expect(result).not.toBe(undefined);
  });

  test("Card() returns an object from .jsx file", () => {
    const result = Card();
    expect(typeof result).toBe("object");
  });

  test("multiple imports from same .tsx file work", () => {
    expect(typeof Greet).toBe("function");
    expect(version).toBe(1);
  });

  test("import from .jsx file works alongside .tsx imports", () => {
    expect(typeof Card).toBe("function");
    expect(typeof cardType).toBe("string");
    expect(typeof Greet).toBe("function");
    expect(typeof version).toBe("number");
  });

  test("TypeScript interfaces are stripped — no runtime error on import", () => {

    
    expect(true).toBe(true);
  });

  test("TypeScript type annotations are stripped — version has number annotation", () => {
    
    expect(version).toBe(1);
    expect(typeof version).toBe("number");
  });
});
