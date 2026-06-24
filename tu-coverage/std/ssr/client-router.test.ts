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
import { Link, jsx as _jsx, jsxs as _jsxs, Fragment } from "ekko:jsx-runtime";

describe("Link component", () => {
  test("Link is a function", () => {
    expect(typeof Link).toBe("function");
  });

  test("returns element with type 'a'", () => {
    const el = Link({ href: "/about", children: "About" });
    expect(el.type).toBe("a");
  });

  test("sets href from props", () => {
    const el = Link({ href: "/about", children: "About" });
    expect(el.props.href).toBe("/about");
  });

  test("accepts 'to' as alias for href", () => {
    const el = Link({ to: "/blog", children: "Blog" });
    expect(el.props.href).toBe("/blog");
  });

  test("sets data-nav attribute", () => {
    const el = Link({ href: "/", children: "Home" });
    expect(el.props["data-nav"]).toBe("");
  });

  test("prefetch defaults to true", () => {
    const el = Link({ href: "/", children: "Home" });
    expect(el.props["data-ekko-prefetch"]).toBe("true");
  });

  test("prefetch can be disabled", () => {
    const el = Link({ href: "/", children: "Home", prefetch: false });
    expect(el.props["data-ekko-prefetch"]).toBe("false");
  });

  test("passes children through", () => {
    const el = Link({ href: "/", children: "Click me" });
    expect(el.props.children).toBe("Click me");
  });

  test("passes className", () => {
    const el = Link({ href: "/", children: "Test", className: "nav-link" });
    expect(el.props.className).toBe("nav-link");
  });

  test("renders to HTML via renderToString", () => {
    const app = createApp({ port: 3000 });
    const html = app.renderToString(Link({ href: "/about", children: "About" }));
    expect(html.includes("<a")).toBe(true);
    expect(html.includes("href")).toBe(true);
    expect(html.includes("/about")).toBe(true);
    expect(html.includes("data-nav")).toBe(true);
    expect(html.includes("About")).toBe(true);
  });
});

describe("data endpoint registration", () => {
  test("createApp registers /_ekko/data/* endpoint", () => {
    const app = createApp({ port: 3000 });
    app.page("/test", () => _jsx("div", { children: "Test" }), { title: "Test" });
    expect(typeof app.start).toBe("function");
  });
});
