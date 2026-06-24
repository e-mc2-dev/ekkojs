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
import { createApp } from "ekko:rune";

describe("htmlShell", () => {
  const app = createApp({ port: 3000 });

  test("htmlShell({}) returns valid HTML document", () => {
    const html = app.htmlShell({});
    expect(typeof html).toBe("string");
    expect(html.includes("<html")).toBe(true);
    expect(html.includes("</html>")).toBe(true);
  });

  test("htmlShell with title includes <title>", () => {
    const html = app.htmlShell({ title: "Hello World" });
    expect(html.includes("<title>Hello World</title>")).toBe(true);
  });

  test("htmlShell with body includes body content", () => {
    const html = app.htmlShell({ body: "<div>content</div>" });
    expect(html.includes("<div>content</div>")).toBe(true);
  });

  test("htmlShell with scripts includes <script> tags", () => {
    const html = app.htmlShell({ scripts: ["/app.js", "/vendor.js"] });
    expect(html.includes('<script src="/app.js"')).toBe(true);
    expect(html.includes('<script src="/vendor.js"')).toBe(true);
  });

  test("htmlShell with styles includes <link> tags", () => {
    const html = app.htmlShell({ styles: ["/style.css", "/theme.css"] });
    expect(html.includes("/style.css")).toBe(true);
    expect(html.includes("/theme.css")).toBe(true);
  });

  test("htmlShell includes doctype", () => {
    const html = app.htmlShell({});
    const lower = html.toLowerCase();
    expect(lower.includes("<!doctype html>")).toBe(true);
  });

  test("htmlShell includes charset meta", () => {
    const html = app.htmlShell({});
    expect(html.includes("charset") || html.includes("UTF-8") || html.includes("utf-8")).toBe(true);
  });

  test("htmlShell includes viewport meta", () => {
    const html = app.htmlShell({});
    expect(html.includes("viewport")).toBe(true);
  });

  test("htmlShell with head adds custom head content", () => {
    const html = app.htmlShell({ head: '<meta name="author" content="Ekko">' });
    expect(html.includes('<meta name="author" content="Ekko">')).toBe(true);
  });

  test("htmlShell escapes title special chars", () => {
    const html = app.htmlShell({ title: "Hello <World> & \"Friends\"" });
    
    expect(html.includes("<World>")).toBe(false);
    expect(html.includes("&lt;") || html.includes("&amp;")).toBe(true);
  });
});
