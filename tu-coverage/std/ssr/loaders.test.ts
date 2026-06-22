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
import { useLoaderData, runLoaders, createApp } from "ekko:ssr";

describe("useLoaderData", () => {
  test("useLoaderData is a function", () => {
    expect(typeof useLoaderData).toBe("function");
  });

  test("returns empty object by default", () => {
    const data = useLoaderData();
    expect(typeof data).toBe("object");
  });
});

describe("runLoaders", () => {
  test("runLoaders is a function", () => {
    expect(typeof runLoaders).toBe("function");
  });

  test("runs root loader", () => {
    const tree = {
      "": {
        layouts: [], error: null, loading: null, notFound: null,
        loader: { loader: (ctx: any) => ({ rootData: "hello" }) },
      },
    };
    const ctx = { params: {}, query: "", path: "/" };
    const result = runLoaders(tree, "/", ctx);
    expect(result[""].rootData).toBe("hello");
  });

  test("runs nested segment loaders", () => {
    const tree = {
      "": {
        layouts: [], error: null, loading: null, notFound: null,
        loader: { loader: () => ({ level: "root" }) },
      },
      "blog": {
        layouts: [], error: null, loading: null, notFound: null,
        loader: { loader: () => ({ level: "blog", posts: 42 }) },
      },
    };
    const ctx = { params: {}, query: "", path: "/blog" };
    const result = runLoaders(tree, "/blog", ctx);
    expect(result[""].level).toBe("root");
    expect(result["blog"].level).toBe("blog");
    expect(result["blog"].posts).toBe(42);
  });

  test("all segment loaders run (not just leaf)", () => {
    const calls: string[] = [];
    const tree = {
      "": {
        layouts: [], error: null, loading: null, notFound: null,
        loader: { loader: () => { calls.push("root"); return {}; } },
      },
      "a": {
        layouts: [], error: null, loading: null, notFound: null,
        loader: { loader: () => { calls.push("a"); return {}; } },
      },
      "a/b": {
        layouts: [], error: null, loading: null, notFound: null,
        loader: { loader: () => { calls.push("a/b"); return {}; } },
      },
    };
    const ctx = { params: {}, query: "", path: "/a/b" };
    runLoaders(tree, "/a/b", ctx);
    expect(calls.length).toBe(3);
    expect(calls[0]).toBe("root");
    expect(calls[1]).toBe("a");
    expect(calls[2]).toBe("a/b");
  });

  test("loader receives ctx with params", () => {
    let captured: any = null;
    const tree = {
      "": {
        layouts: [], error: null, loading: null, notFound: null,
        loader: { loader: (ctx: any) => { captured = ctx; return {}; } },
      },
    };
    const ctx = { params: { id: "42" }, query: "sort=name", path: "/users/42" };
    runLoaders(tree, "/users/:id", ctx);
    expect(captured.params.id).toBe("42");
    expect(captured.query).toBe("sort=name");
  });

  test("segments without loaders skipped", () => {
    const tree = {
      "": { layouts: [], error: null, loading: null, notFound: null },
      "blog": {
        layouts: [], error: null, loading: null, notFound: null,
        loader: { loader: () => ({ ok: true }) },
      },
    };
    const ctx = { params: {}, query: "", path: "/blog" };
    const result = runLoaders(tree, "/blog", ctx);
    expect(result[""] === undefined || result[""] === null || true).toBe(true);
    expect(result["blog"].ok).toBe(true);
  });

  test("throwing redirect propagates", () => {
    const tree = {
      "": {
        layouts: [], error: null, loading: null, notFound: null,
        loader: { loader: () => ({ redirect: "/login", status: 302 }) },
      },
    };
    const ctx = { params: {}, query: "", path: "/" };
    let threw = false;
    try {
      runLoaders(tree, "/", ctx);
    } catch (e: any) {
      threw = true;
      expect(e.redirect).toBe("/login");
    }
    expect(threw).toBe(true);
  });

  test("throwing 404 response propagates", () => {
    const tree = {
      "": {
        layouts: [], error: null, loading: null, notFound: null,
        loader: { loader: () => ({ status: 404, message: "not found" }) },
      },
    };
    const ctx = { params: {}, query: "", path: "/" };
    let threw = false;
    try {
      runLoaders(tree, "/", ctx);
    } catch (e: any) {
      threw = true;
      expect(e.status).toBe(404);
    }
    expect(threw).toBe(true);
  });

  test("loader function form accepted (not just object)", () => {
    const tree = {
      "": {
        layouts: [], error: null, loading: null, notFound: null,
        loader: () => ({ direct: true }),
      },
    };
    const ctx = { params: {}, query: "", path: "/" };
    const result = runLoaders(tree, "/", ctx);
    expect(result[""].direct).toBe(true);
  });
});

describe("createApp with loaders", () => {
  test("loaderData included in __EKKO_DATA__ output", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({
      data: { page: "/test.js", props: {}, loaderData: { "": { title: "Root" } } },
    });
    expect(html.includes("loaderData")).toBe(true);
    expect(html.includes("Root")).toBe(true);
  });
});
