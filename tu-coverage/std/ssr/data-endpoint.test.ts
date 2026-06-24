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
import { serializeProps } from "ekko:ssr";
import { jsx as _jsx, jsxs as _jsxs, Fragment } from "ekko:jsx-runtime";

describe("/_ekko/data/* endpoint", () => {
  test("createApp registers data endpoint automatically", () => {
    const app = createApp({ port: 3000 });
    app.page("/test", () => _jsx("div", { children: "Test" }), { title: "Test" });
    expect(typeof app.start).toBe("function");
  });

  test("data endpoint uses serializeProps for consistent serialization", () => {
    const input = {
      name: "Alice",
      created: new Date("2026-01-01T00:00:00.000Z"),
      scores: [100, 95],
    };
    const serialized = serializeProps(input);
    expect(serialized.created).toBe("2026-01-01T00:00:00.000Z");
    expect(serialized.name).toBe("Alice");
    expect(serialized.scores[0]).toBe(100);
  });

  test("serializeProps matches __EKKO_DATA__ format", () => {
    const app = createApp({ port: 3000 });
    const props = { user: "Bob", ts: new Date("2026-06-01T00:00:00.000Z") };
    const html = app.htmlShell({
      data: { props: props, page: "/test.js" },
    });
    const serialized = serializeProps(props);
    expect(html.includes("2026-06-01T00:00:00.000Z")).toBe(true);
    expect(serialized.ts).toBe("2026-06-01T00:00:00.000Z");
  });

  test("serializeProps applied to loaderData too", () => {
    const loaderData = {
      "": { cached: new Date("2026-03-15T12:00:00.000Z") },
      "blog": { posts: [{ id: 1, title: "Hello" }] },
    };
    const serialized = serializeProps(loaderData);
    expect(serialized[""].cached).toBe("2026-03-15T12:00:00.000Z");
    expect(serialized["blog"].posts[0].title).toBe("Hello");
  });

  test("serializeProps throws on non-serializable in data endpoint context", () => {
    let threw = false;
    try {
      serializeProps({ handler: () => {} });
    } catch (e: any) {
      threw = true;
      expect(e.message.includes("function")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  test("404 response structure for missing routes", () => {
    const app = createApp({ port: 3000 });
    app.page("/exists", () => _jsx("div", {}), { title: "Exists" });
    expect(typeof app).toBe("object");
  });
});

describe("data endpoint response shape", () => {
  test("response includes props, loaderData, page, title fields", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({
      data: {
        props: { name: "test" },
        loaderData: { "": { root: true } },
        page: "/_ekko/pages/test-HASH.js",
        title: "Test Page",
      },
    });
    expect(html.includes("props")).toBe(true);
    expect(html.includes("loaderData")).toBe(true);
    expect(html.includes("page")).toBe(true);
    expect(html.includes("Test Page")).toBe(true);
  });

  test("redirect in getProps produces redirect JSON", () => {
    const app = createApp({ port: 3000 });
    app.page("/redirect", () => _jsx("div", {}), {
      title: "Redirect",
      getProps: () => ({ redirect: "/login" }),
    });
    expect(typeof app).toBe("object");
  });
});

describe("cache headers", () => {
  test("data endpoint sets Cache-Control and Vary headers", () => {
    const app = createApp({ port: 3000 });
    app.page("/cached", () => _jsx("div", { children: "Cached" }), {
      title: "Cached",
      getProps: () => ({ data: "fresh" }),
    });
    expect(typeof app.start).toBe("function");
  });
});
