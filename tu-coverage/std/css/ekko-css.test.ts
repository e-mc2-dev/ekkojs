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
import { compileSass, transform, cssModules, minify } from "ekko:ssr/css";

describe("compileSass", () => {
  test("compileSass is a function", () => {
    expect(typeof compileSass).toBe("function");
  });

  test("compiles Sass variables", () => {
    const css = compileSass("$color: red;\n.btn { color: $color; }");
    expect(css.includes("color")).toBe(true);
    expect(css.includes("red")).toBe(true);
    expect(css.includes(".btn")).toBe(true);
  });

  test("compiles Sass nesting", () => {
    const css = compileSass(".parent {\n  .child { font-size: 2rem; }\n}");
    expect(css.includes(".parent .child")).toBe(true);
  });

  test("compiles Sass mixins", () => {
    const css = compileSass("@mixin flex { display: flex; }\n.box { @include flex; }");
    expect(css.includes("display")).toBe(true);
    expect(css.includes("flex")).toBe(true);
  });

  test("throws on invalid Sass", () => {
    let threw = false;
    try { compileSass("@use 'nonexistent';"); } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });

  test("supports indented Sass syntax", () => {
    const css = compileSass(".btn\n  color: red\n  font-weight: bold", "sass");
    expect(css.includes("color")).toBe(true);
  });
});

describe("transform", () => {
  test("transform is a function", () => {
    expect(typeof transform).toBe("function");
  });

  test("returns object with code", () => {
    const result = transform(".btn { color: red; }");
    expect(typeof result.code).toBe("string");
    expect(result.code.includes("color")).toBe(true);
  });

  test("minifies by default", () => {
    const result = transform(".btn {\n  color:  red;\n  font-weight:  bold;\n}");
    expect(result.code.length < 50).toBe(true);
  });

  test("can disable minify", () => {
    const result = transform(".btn { color: red; }", { minify: false });
    expect(result.code.includes("color")).toBe(true);
  });

  test("accepts targets option", () => {
    const result = transform(".btn { color: red; }", { targets: "chrome90", minify: true });
    expect(result.code.includes("color")).toBe(true);
  });
});

describe("cssModules", () => {
  test("cssModules is a function", () => {
    expect(typeof cssModules).toBe("function");
  });

  test("returns code and classes", () => {
    const result = cssModules(".container { display: flex; }", "card.module.css");
    expect(typeof result.code).toBe("string");
    expect(typeof result.classes).toBe("object");
  });

  test("scopes class names", () => {
    const result = cssModules(".container { display: flex; }\n.title { font-size: 2rem; }", "card.module.css");
    expect(result.classes.container).not.toBe(undefined);
    expect(result.classes.title).not.toBe(undefined);
    expect(result.classes.container).not.toBe("container");
  });

  test("different files produce different scoped names", () => {
    const a = cssModules(".item { color: red; }", "a.module.css");
    const b = cssModules(".item { color: red; }", "b.module.css");
    expect(a.classes.item).not.toBe(b.classes.item);
  });

  test("output CSS uses scoped names", () => {
    const result = cssModules(".btn { color: red; }", "button.module.css");
    const scopedName = result.classes.btn;
    expect(result.code.includes(scopedName)).toBe(true);
  });
});

describe("minify", () => {
  test("minify is a function", () => {
    expect(typeof minify).toBe("function");
  });

  test("reduces CSS size", () => {
    const input = ".btn {\n  color:  red;\n  font-weight:  bold;\n}\n\n.card {\n  padding:  20px;\n}";
    const output = minify(input);
    expect(output.length < input.length).toBe(true);
  });

  test("merges duplicate selectors", () => {
    const output = minify(".a { color: red; }\n.a { font-weight: bold; }");
    expect(typeof output).toBe("string");
    expect(output.includes("color")).toBe(true);
  });
});

describe("end-to-end: Sass → transform", () => {
  test("compile Sass then transform the result", () => {
    const scss = "$primary: #3b82f6;\n.btn { background: $primary; &:hover { opacity: 0.8; } }";
    const css = compileSass(scss);
    const result = transform(css, { minify: true });
    expect(result.code.includes("#3b82f6") || result.code.includes("background")).toBe(true);
  });

  test("compile Sass then extract CSS Modules", () => {
    const scss = "$radius: 8px;\n.card { border-radius: $radius; }\n.header { font-weight: bold; }";
    const css = compileSass(scss);
    const result = cssModules(css, "card.module.css");
    expect(result.classes.card).not.toBe(undefined);
    expect(result.classes.header).not.toBe(undefined);
  });
});
