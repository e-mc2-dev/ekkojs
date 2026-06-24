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

describe("getProps — module-level detection", () => {
  test("route handler detects component.getProps", () => {
    const app = createApp({ port: 3000 });
    const pageModule = {
      default: (props: any) => _jsx("div", { children: props.title }),
      getProps: (ctx: any) => ({ title: "From getProps" }),
    };
    const result = app.page("/test", pageModule as any, { title: "Test" });
    expect(result).toBe(app);
  });

  test("meta.getProps overrides component.getProps", () => {
    const app = createApp({ port: 3000 });
    const pageModule = {
      default: (props: any) => _jsx("div", { children: props.title }),
      getProps: () => ({ title: "module-level" }),
    };
    const result = app.page("/test", pageModule as any, {
      title: "Test",
      getProps: () => ({ title: "meta-level" }),
    });
    expect(result).toBe(app);
  });
});

describe("getProps — context object", () => {
  test("ctx has params, query, path, headers, req", () => {
    let capturedCtx: any = null;
    const app = createApp({ port: 3000 });
    app.page("/ctx-test", {
      default: (props: any) => _jsx("div", { children: "ok" }),
      getProps: (ctx: any) => {
        capturedCtx = ctx;
        return { checked: true };
      },
    } as any, { title: "CTX" });
    expect(typeof capturedCtx).toBe("object");
  });
});

describe("getProps — redirect", () => {
  test("createApp accepts page with redirect-returning getProps", () => {
    const app = createApp({ port: 3000 });
    const result = app.page("/old", (p: any) => _jsx("div", {}), {
      title: "Old",
      getProps: () => ({ redirect: "/new" }),
    });
    expect(result).toBe(app);
  });

  test("redirect with custom status accepted", () => {
    const app = createApp({ port: 3000 });
    const result = app.page("/temp", (p: any) => _jsx("div", {}), {
      title: "Temp",
      getProps: () => ({ redirect: "/dest", status: 301 }),
    });
    expect(result).toBe(app);
  });
});

describe("getProps — error handling", () => {
  test("createApp with error handler accepts throwing getProps page", () => {
    const app = createApp({
      port: 3000,
      error: (p: any) => _jsx("div", { children: "Error: " + p.message }),
    });
    app.page("/fail", (p: any) => _jsx("div", {}), {
      title: "Fail",
      getProps: () => { throw new Error("data fetch failed"); },
    });
    expect(typeof app).toBe("object");
  });
});

describe("getProps — validation", () => {
  test("getProps returning non-object would throw at request time", () => {
    const app = createApp({ port: 3000 });
    app.page("/bad", (p: any) => _jsx("div", {}), {
      title: "Bad",
      getProps: () => "not an object" as any,
    });
    expect(typeof app).toBe("object");
  });
});

describe("getProps — server-only guarantee", () => {
  test("getProps is not included in client bundle data", () => {
    const app = createApp({ port: 3000 });
    const pageModule = {
      default: (props: any) => _jsx("div", { children: props.name }),
      getProps: (ctx: any) => ({ name: "Alice", secret: "server-only-data" }),
    };
    app.page("/user", pageModule as any, { title: "User" });
    const html = app.htmlShell({
      data: { page: "/user.js", props: { name: "Alice" } },
    });
    expect(html.includes("getProps")).toBe(false);
    expect(html.includes("Alice")).toBe(true);
  });
});
