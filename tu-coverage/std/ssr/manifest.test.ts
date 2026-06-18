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
import { createApp, readManifest, resolvePageAssets } from "ekko:ssr";

describe("readManifest", () => {
  test("readManifest is a function", () => {
    expect(typeof readManifest).toBe("function");
  });

  test("readManifest returns default when file missing", () => {
    const m = readManifest("/nonexistent/manifest.json");
    expect(m.hydrate).toBe(null);
    expect(typeof m.pages).toBe("object");
    expect(Array.isArray(m.chunks)).toBe(true);
  });
});

describe("resolvePageAssets", () => {
  test("resolvePageAssets is a function", () => {
    expect(typeof resolvePageAssets).toBe("function");
  });

  test("resolves page with file+imports format", () => {
    const manifest = {
      hydrate: "_hydrate-abc123.js",
      pages: {
        "index.tsx": {
          file: "pages/index-def456.js",
          imports: ["chunks/chunk-xyz789.js"],
        },
      },
      chunks: ["chunks/chunk-xyz789.js"],
    };
    const assets = resolvePageAssets(manifest, "index.tsx");
    expect(assets.modules.length).toBe(1);
    expect(assets.modules[0]).toBe("/_ekko/_hydrate-abc123.js");
    expect(assets.pageFile).toBe("/_ekko/pages/index-def456.js");
    expect(assets.modulepreload.length).toBe(1);
    expect(assets.modulepreload[0]).toBe("/_ekko/chunks/chunk-xyz789.js");
  });

  test("resolves page with string format (backward compat)", () => {
    const manifest = {
      hydrate: "_hydrate-abc.js",
      pages: {
        "index.tsx": "pages/index-def.js",
      },
      chunks: [],
    };
    const assets = resolvePageAssets(manifest, "index.tsx");
    expect(assets.pageFile).toBe("/_ekko/pages/index-def.js");
    expect(assets.modules[0]).toBe("/_ekko/_hydrate-abc.js");
    expect(assets.modulepreload.length).toBe(0);
  });

  test("returns empty when page not in manifest", () => {
    const manifest = {
      hydrate: "_hydrate-abc.js",
      pages: {},
      chunks: [],
    };
    const assets = resolvePageAssets(manifest, "missing.tsx");
    expect(assets.pageFile).toBe(null);
    expect(assets.modules.length).toBe(1);
    expect(assets.modulepreload.length).toBe(0);
  });

  test("returns empty modules when no hydrate", () => {
    const manifest = {
      hydrate: null,
      pages: {
        "index.tsx": { file: "pages/index.js", imports: [] },
      },
      chunks: [],
    };
    const assets = resolvePageAssets(manifest, "index.tsx");
    expect(assets.modules.length).toBe(0);
    expect(assets.pageFile).toBe("/_ekko/pages/index.js");
  });

  test("custom prefix", () => {
    const manifest = {
      hydrate: "_hydrate.js",
      pages: {
        "index.tsx": { file: "pages/index.js", imports: ["chunks/c.js"] },
      },
      chunks: ["chunks/c.js"],
    };
    const assets = resolvePageAssets(manifest, "index.tsx", "/static/");
    expect(assets.modules[0]).toBe("/static/_hydrate.js");
    expect(assets.pageFile).toBe("/static/pages/index.js");
    expect(assets.modulepreload[0]).toBe("/static/chunks/c.js");
  });

  test("multiple imports resolved", () => {
    const manifest = {
      hydrate: "_hydrate.js",
      pages: {
        "index.tsx": {
          file: "pages/index.js",
          imports: ["chunks/react.js", "chunks/vendor.js", "chunks/utils.js"],
        },
      },
      chunks: ["chunks/react.js", "chunks/vendor.js", "chunks/utils.js"],
    };
    const assets = resolvePageAssets(manifest, "index.tsx");
    expect(assets.modulepreload.length).toBe(3);
    expect(assets.modulepreload[0]).toBe("/_ekko/chunks/react.js");
    expect(assets.modulepreload[1]).toBe("/_ekko/chunks/vendor.js");
    expect(assets.modulepreload[2]).toBe("/_ekko/chunks/utils.js");
  });
});

describe("createApp with manifest", () => {
  test("createApp accepts manifest option", () => {
    const manifest = {
      hydrate: "_hydrate-abc.js",
      pages: {
        "index.tsx": { file: "pages/index-def.js", imports: ["chunks/c.js"] },
      },
      chunks: ["chunks/c.js"],
    };
    const app = createApp({ port: 3000, manifest });
    expect(typeof app).toBe("object");
    expect(typeof app.resolvePageAssets).toBe("function");
  });

  test("app.resolvePageAssets uses app manifest", () => {
    const manifest = {
      hydrate: "_hydrate-abc.js",
      pages: {
        "index.tsx": { file: "pages/index-def.js", imports: ["chunks/c.js"] },
      },
      chunks: ["chunks/c.js"],
    };
    const app = createApp({ port: 3000, manifest });
    const assets = app.resolvePageAssets("index.tsx");
    expect(assets.pageFile).toBe("/_ekko/pages/index-def.js");
    expect(assets.modulepreload.length).toBe(1);
  });

  test("htmlShell with manifest data includes modulepreload", () => {
    const manifest = {
      hydrate: "_hydrate-abc.js",
      pages: {
        "index.tsx": { file: "pages/index-def.js", imports: ["chunks/chunk-xyz.js"] },
      },
      chunks: ["chunks/chunk-xyz.js"],
    };
    const app = createApp({ port: 3000, manifest });
    const assets = app.resolvePageAssets("index.tsx");
    const html = app.htmlShell({
      title: "Test",
      body: "<h1>Hi</h1>",
      modules: assets.modules,
      modulepreload: assets.modulepreload,
      data: { page: assets.pageFile, props: {} },
    });
    expect(html.includes("modulepreload")).toBe(true);
    expect(html.includes("chunks/chunk-xyz.js")).toBe(true);
    expect(html.includes("_hydrate-abc.js")).toBe(true);
    expect(html.includes("pages/index-def.js")).toBe(true);
  });
});
