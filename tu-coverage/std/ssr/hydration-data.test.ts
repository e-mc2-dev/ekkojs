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

describe("htmlShell hydration data (__EKKO_DATA__)", () => {
  test("serializes data into a __EKKO_DATA__ json script tag", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({ data: { page: "/test.js", props: {} } });
    expect(html.includes("__EKKO_DATA__")).toBe(true);
    expect(html.includes('type="application/json"')).toBe(true);
  });

  test("includes the page chunk path", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({ data: { page: "/pages/index-abc.js", props: {} } });
    expect(html.includes("/pages/index-abc.js")).toBe(true);
  });

  test("includes serialized props", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({ data: { page: "/test.js", props: { title: "Root", count: 42 } } });
    expect(html.includes("Root")).toBe(true);
    expect(html.includes("42")).toBe(true);
  });

  test("empty options still produce a valid document", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({});
    expect(html.includes("<html")).toBe(true);
    expect(html.includes("</html>")).toBe(true);
  });
});
