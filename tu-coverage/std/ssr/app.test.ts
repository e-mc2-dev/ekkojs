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
import { jsx as _jsx, jsxs as _jsxs, Fragment } from "ekko:jsx-runtime";

describe("createApp", () => {
  test("createApp returns object", () => {
    const app = createApp({ port: 3000 });
    expect(typeof app).toBe("object");
    expect(app).not.toBe(null);
  });

  test("app.page is a function", () => {
    const app = createApp({ port: 3000 });
    expect(typeof app.page).toBe("function");
  });

  test("app.api is a function", () => {
    const app = createApp({ port: 3000 });
    expect(typeof app.api).toBe("function");
  });

  test("app.layout is a function", () => {
    const app = createApp({ port: 3000 });
    expect(typeof app.layout).toBe("function");
  });

  test("app.use is a function", () => {
    const app = createApp({ port: 3000 });
    expect(typeof app.use).toBe("function");
  });

  test("app.start is a function", () => {
    const app = createApp({ port: 3000 });
    expect(typeof app.start).toBe("function");
  });

  test("app.page returns app (chaining)", () => {
    const app = createApp({ port: 3000 });
    const result = app.page("/", () => _jsx("h1", { children: "Home" }), { title: "Home" });
    expect(result).toBe(app);
  });

  test("app.api returns app (chaining)", () => {
    const app = createApp({ port: 3000 });
    const result = app.api("GET", "/api/test", (_req: any, res: any) => res.json({ ok: true }));
    expect(result).toBe(app);
  });

  test("app.layout returns app (chaining)", () => {
    const app = createApp({ port: 3000 });
    const result = app.layout(({ children }: any) => _jsx("html", { children }));
    expect(result).toBe(app);
  });

  test("app.use returns app (chaining)", () => {
    const app = createApp({ port: 3000 });
    const result = app.use((_req: any, _res: any, next: any) => next());
    expect(result).toBe(app);
  });

  test("app.renderToString is a function", () => {
    const app = createApp({ port: 3000 });
    expect(typeof app.renderToString).toBe("function");
  });

  test("app.htmlShell is a function", () => {
    const app = createApp({ port: 3000 });
    expect(typeof app.htmlShell).toBe("function");
  });

  test("htmlShell returns HTML string", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({ title: "Test" });
    expect(typeof html).toBe("string");
    expect(html.includes("<html")).toBe(true);
  });

  test("htmlShell includes title", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({ title: "My Page" });
    expect(html.includes("<title>My Page</title>")).toBe(true);
  });

  test("htmlShell includes doctype", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({ title: "Test" });
    expect(html.includes("<!DOCTYPE html>") || html.includes("<!doctype html>")).toBe(true);
  });

  test("htmlShell with data serializes to __EKKO_DATA__ script tag", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({ data: { page: "/index.js", props: { name: "Alice" } } });
    expect(html.includes("__EKKO_DATA__")).toBe(true);
    expect(html.includes("application/json")).toBe(true);
    expect(html.includes("Alice")).toBe(true);
  });

  test("htmlShell with data serializes Date to ISO string", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({ data: { props: { ts: new Date("2026-01-01T00:00:00.000Z") } } });
    expect(html.includes("2026-01-01T00:00:00.000Z")).toBe(true);
  });

  test("htmlShell with data throws on function in props", () => {
    const app = createApp({ port: 3000 });
    let threw = false;
    try {
      app.htmlShell({ data: { props: { fn: () => {} } } });
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("function")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("app.page with getProps is accepted", () => {
    const app = createApp({ port: 3000 });
    const result = app.page("/", () => _jsx("h1", { children: "Home" }), {
      title: "Home",
      getProps: () => ({ greeting: "hello" }),
    });
    expect(result).toBe(app);
  });
});
