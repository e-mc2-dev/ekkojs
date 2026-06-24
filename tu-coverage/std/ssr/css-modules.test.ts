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
import { cssModule, resolvePageAssets, createApp } from "ekko:rune";
import { mkdir, writeText, remove } from "ekko:fs";

const TEST_DIR = ".ekko-test-css-" + Date.now();

describe("cssModule (lightningcss-backed)", () => {
  test("cssModule is a function", () => {
    expect(typeof cssModule).toBe("function");
  });

  test("returns empty object for missing file", () => {
    const classes = cssModule("/nonexistent.module.css");
    expect(typeof classes).toBe("object");
    expect(Object.keys(classes).length).toBe(0);
  });

  test("extracts and scopes class names from .module.css", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/button.module.css", ".container { display: flex; }\n.title { font-size: 2rem; }\n.active { color: red; }");
    try {
      const classes = cssModule(TEST_DIR + "/button.module.css");
      expect(typeof classes.container).toBe("string");
      expect(typeof classes.title).toBe("string");
      expect(typeof classes.active).toBe("string");
      expect(classes.container).not.toBe("container");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("different files produce different scoped names", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/a.module.css", ".item { display: block; }");
    writeText(TEST_DIR + "/b.module.css", ".item { display: block; }");
    try {
      const a = cssModule(TEST_DIR + "/a.module.css");
      const b = cssModule(TEST_DIR + "/b.module.css");
      expect(a.item).not.toBe(b.item);
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("handles multiple classes", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/multi.module.css", ".header { color: red; }\n.content { padding: 10px; }\n.footer { margin: 0; }\n.sidebar { width: 200px; }");
    try {
      const classes = cssModule(TEST_DIR + "/multi.module.css");
      expect(Object.keys(classes).length).toBe(4);
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("handles hyphenated class names", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/hyph.module.css", ".nav-bar { color: red; }\n.btn-primary { padding: 10px; }");
    try {
      const classes = cssModule(TEST_DIR + "/hyph.module.css");
      expect(typeof classes["nav-bar"]).toBe("string");
      expect(typeof classes["btn-primary"]).toBe("string");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });
});

describe("cssModule with .scss files", () => {
  test("compiles Sass then extracts CSS Modules", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/vars.module.scss", "$color: red;\n.btn { color: $color; }\n.card { padding: 20px; }");
    try {
      const classes = cssModule(TEST_DIR + "/vars.module.scss");
      expect(typeof classes.btn).toBe("string");
      expect(typeof classes.card).toBe("string");
      expect(classes.btn).not.toBe("btn");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test(".scss with nesting", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/nested.module.scss", ".parent { color: blue; .child { font-weight: bold; } }");
    try {
      const classes = cssModule(TEST_DIR + "/nested.module.scss");
      expect(typeof classes.parent).toBe("string");
      expect(typeof classes.child).toBe("string");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("returns empty for missing .scss", () => {
    const classes = cssModule("/nonexistent.module.scss");
    expect(Object.keys(classes).length).toBe(0);
  });
});

describe("resolvePageAssets with CSS", () => {
  test("includes global styles from manifest", () => {
    const manifest = {
      hydrate: "_hydrate.js",
      pages: { "index.tsx": { file: "pages/index.js", imports: [], css: [] } },
      chunks: [],
      styles: ["styles/global-abc.css"],
    };
    const assets = resolvePageAssets(manifest, "index.tsx");
    expect(assets.styles.length).toBe(1);
    expect(assets.styles[0]).toBe("/_ekko/styles/global-abc.css");
  });
});
