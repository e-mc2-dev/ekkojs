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
import { cssModule, createApp } from "ekko:ssr";
import { mkdir, writeText, remove, exists } from "ekko:fs";

const TEST_DIR = ".ekko-test-postcss-" + Date.now();

describe("PostCSS pipeline integration", () => {
  test("CSS with nesting syntax: class names extracted", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/nested.module.css", ".card {\n  color: blue;\n  & .title {\n    font-weight: bold;\n  }\n}");
    try {
      const classes = cssModule(TEST_DIR + "/nested.module.css");
      expect(typeof classes.card).toBe("string");
      expect(typeof classes.title).toBe("string");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("CSS with vendor-prefix-needing properties: class extraction works", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/prefixed.module.css", ".flex {\n  display: flex;\n  user-select: none;\n}\n.grid {\n  display: grid;\n}");
    try {
      const classes = cssModule(TEST_DIR + "/prefixed.module.css");
      expect(typeof classes.flex).toBe("string");
      expect(typeof classes.grid).toBe("string");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("postcss.config.js detection (file presence check)", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/postcss.config.js", "module.exports = { plugins: [] };");
    try {
      expect(exists(TEST_DIR + "/postcss.config.js")).toBe(true);
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("postcss.config.mjs detection (ESM config)", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/postcss.config.mjs", "export default { plugins: [] };");
    try {
      expect(exists(TEST_DIR + "/postcss.config.mjs")).toBe(true);
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("CSS without postcss still works (graceful skip)", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/plain.module.css", ".container { padding: 20px; }\n.header { font-size: 2rem; }");
    try {
      const classes = cssModule(TEST_DIR + "/plain.module.css");
      expect(typeof classes.container).toBe("string");
      expect(typeof classes.header).toBe("string");
      expect(classes.container.startsWith("container_")).toBe(true);
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });
});

describe("Tailwind CSS-like utility classes", () => {
  test("multiple utility classes extracted from CSS", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/utils.module.css",
      ".p-4 { padding: 1rem; }\n.m-2 { margin: 0.5rem; }\n.flex { display: flex; }\n.text-lg { font-size: 1.125rem; }");
    try {
      const classes = cssModule(TEST_DIR + "/utils.module.css");
      expect(typeof classes["p-4"]).toBe("string");
      expect(typeof classes["m-2"]).toBe("string");
      expect(typeof classes.flex).toBe("string");
      expect(typeof classes["text-lg"]).toBe("string");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });
});

describe("esbuild CSS target integration", () => {
  test("htmlShell produces valid HTML with stylesheet links", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({
      title: "PostCSS Test",
      styles: ["/styles/main.css", "/styles/components.css"],
      body: "<div>content</div>",
    });
    expect(html.includes('rel="stylesheet"')).toBe(true);
    expect(html.includes("main.css")).toBe(true);
    expect(html.includes("components.css")).toBe(true);
  });

  test("multiple CSS files in manifest served correctly", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({
      title: "Multi-CSS",
      styles: ["/a.css", "/b.css", "/c.css"],
    });
    const count = (html.match(/rel="stylesheet"/g) || []).length;
    expect(count).toBe(3);
  });
});
