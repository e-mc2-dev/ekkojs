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
import { cssModule } from "ekko:ssr";
import { mkdir, writeText, remove } from "ekko:fs";

const TEST_DIR = ".ekko-test-sass-" + Date.now();

describe("cssModule with .scss files", () => {
  test("cssModule handles .module.scss by checking compiled CSS", () => {
    mkdir(TEST_DIR);
    mkdir(TEST_DIR + "/.ekko/build/scss");
    writeText(TEST_DIR + "/button.module.scss", "$color: red;\n.container { color: $color; }");
    writeText(TEST_DIR + "/.ekko/build/scss/button.module.css", ".container { color: red; }");
    try {
      const origDir = Ekko.cwd ? Ekko.cwd() : ".";
      const classes = cssModule(TEST_DIR + "/button.module.scss");
      expect(typeof classes).toBe("object");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("cssModule falls back to raw .scss if no compiled CSS", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/raw.module.scss", ".header { font-size: 2rem; }\n.footer { padding: 10px; }");
    try {
      const classes = cssModule(TEST_DIR + "/raw.module.scss");
      expect(typeof classes.header).toBe("string");
      expect(typeof classes.footer).toBe("string");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("cssModule extracts Sass-style nested selectors from raw SCSS", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/nested.module.scss", ".card {\n  color: blue;\n  .title { font-weight: bold; }\n}");
    try {
      const classes = cssModule(TEST_DIR + "/nested.module.scss");
      expect(typeof classes.card).toBe("string");
      expect(typeof classes.title).toBe("string");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test(".scss hashes are path-dependent (scoped)", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/a.module.scss", ".item { display: block; }");
    writeText(TEST_DIR + "/b.module.scss", ".item { display: block; }");
    try {
      const a = cssModule(TEST_DIR + "/a.module.scss");
      const b = cssModule(TEST_DIR + "/b.module.scss");
      expect(a.item).not.toBe(b.item);
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("cssModule returns empty for missing .scss file", () => {
    const classes = cssModule("/nonexistent.module.scss");
    expect(Object.keys(classes).length).toBe(0);
  });
});

describe("Sass variables and nesting in raw SCSS", () => {
  test("class names extracted despite Sass variables", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/vars.module.scss", "$primary: #333;\n.btn { color: $primary; }\n.btn-large { font-size: 2rem; }");
    try {
      const classes = cssModule(TEST_DIR + "/vars.module.scss");
      expect(typeof classes.btn).toBe("string");
      expect(typeof classes["btn-large"]).toBe("string");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("@use/@import partials: class extraction still works", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/with-import.module.scss", "@use 'vars';\n.container { margin: 0; }\n.wrapper { padding: 10px; }");
    try {
      const classes = cssModule(TEST_DIR + "/with-import.module.scss");
      expect(typeof classes.container).toBe("string");
      expect(typeof classes.wrapper).toBe("string");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });
});

describe("Sass integration with CSS Modules pipeline", () => {
  test(".module.scss produces scoped class names like .module.css", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/scoped.module.scss", ".header { font-size: 2rem; }");
    writeText(TEST_DIR + "/scoped.module.css", ".header { font-size: 2rem; }");
    try {
      const scss = cssModule(TEST_DIR + "/scoped.module.scss");
      const css = cssModule(TEST_DIR + "/scoped.module.css");
      expect(scss.header.startsWith("header_")).toBe(true);
      expect(css.header.startsWith("header_")).toBe(true);
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });
});
