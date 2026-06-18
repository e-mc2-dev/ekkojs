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
import { createApp, resolvePageAssets, cssModule } from "ekko:ssr";
import { mkdir, writeText, remove, exists } from "ekko:fs";

const TEST_DIR = ".ekko-test-tw-" + Date.now();

describe("Tailwind CSS support", () => {
  test("tailwind.config.js detection", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/tailwind.config.js", "module.exports = { content: ['./pages/**/*.tsx'] };");
    try {
      expect(exists(TEST_DIR + "/tailwind.config.js")).toBe(true);
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("tailwind.config.ts detection", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/tailwind.config.ts", "export default { content: ['./pages/**/*.tsx'] };");
    try {
      expect(exists(TEST_DIR + "/tailwind.config.ts")).toBe(true);
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("@tailwind directive detected in CSS", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/globals.css", "@tailwind base;\n@tailwind components;\n@tailwind utilities;");
    try {
      const content = new TextDecoder().decode(__readStaticFile(TEST_DIR + "/globals.css"));
      expect(content.includes("@tailwind")).toBe(true);
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });

  test("@import tailwindcss detected in CSS", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/styles.css", "@import \"tailwindcss\";\n.custom { color: red; }");
    try {
      const content = new TextDecoder().decode(__readStaticFile(TEST_DIR + "/styles.css"));
      expect(content.includes("tailwindcss")).toBe(true);
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });
});

describe("Tailwind classes in components", () => {
  test("JSX className with Tailwind utilities renders correctly", () => {
    const app = createApp({ port: 3000 });
    const html = app.renderToString(
      _jsx("div", {
        className: "flex items-center p-4 bg-blue-500 text-white rounded-lg shadow-md",
        children: _jsx("span", { className: "text-lg font-bold", children: "Hello" }),
      })
    );
    expect(html.includes("flex items-center")).toBe(true);
    expect(html.includes("text-lg font-bold")).toBe(true);
    expect(html.includes("Hello")).toBe(true);
  });

  test("dark mode classes pass through SSR", () => {
    const app = createApp({ port: 3000 });
    const html = app.renderToString(
      _jsx("div", { className: "bg-white dark:bg-gray-900 text-black dark:text-white" })
    );
    expect(html.includes("dark:bg-gray-900")).toBe(true);
    expect(html.includes("dark:text-white")).toBe(true);
  });

  test("responsive classes pass through SSR", () => {
    const app = createApp({ port: 3000 });
    const html = app.renderToString(
      _jsx("div", { className: "w-full md:w-1/2 lg:w-1/3" })
    );
    expect(html.includes("md:w-1/2")).toBe(true);
    expect(html.includes("lg:w-1/3")).toBe(true);
  });

  test("hover/focus variants pass through SSR", () => {
    const app = createApp({ port: 3000 });
    const html = app.renderToString(
      _jsx("button", { className: "bg-blue-500 hover:bg-blue-700 focus:ring-2" })
    );
    expect(html.includes("hover:bg-blue-700")).toBe(true);
    expect(html.includes("focus:ring-2")).toBe(true);
  });
});

describe("Tailwind in manifest", () => {
  test("manifest with tailwind.css in styles array", () => {
    const manifest = {
      hydrate: "_hydrate.js",
      pages: { "index.tsx": { file: "pages/index.js", imports: [], css: [] } },
      chunks: [],
      styles: ["tailwind.css", "custom.css"],
    };
    const assets = resolvePageAssets(manifest, "index.tsx");
    expect(assets.styles.length).toBe(2);
    expect(assets.styles[0]).toBe("/_ekko/tailwind.css");
    expect(assets.styles[1]).toBe("/_ekko/custom.css");
  });

  test("htmlShell with tailwind CSS link", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({
      title: "TW",
      styles: ["/_ekko/tailwind.css"],
      body: "<div class='p-4'>content</div>",
    });
    expect(html.includes("tailwind.css")).toBe(true);
    expect(html.includes('rel="stylesheet"')).toBe(true);
  });
});

describe("@apply in CSS Modules with Tailwind", () => {
  test("cssModule extracts classes from CSS with @apply", () => {
    mkdir(TEST_DIR);
    writeText(TEST_DIR + "/button.module.css", ".btn {\n  @apply px-4 py-2 rounded;\n}\n.btn-primary {\n  @apply bg-blue-500 text-white;\n}");
    try {
      const classes = cssModule(TEST_DIR + "/button.module.css");
      expect(typeof classes.btn).toBe("string");
      expect(typeof classes["btn-primary"]).toBe("string");
    } finally { try { remove(TEST_DIR, true); } catch(e) {} }
  });
});

declare function __readStaticFile(path: string): Uint8Array;
