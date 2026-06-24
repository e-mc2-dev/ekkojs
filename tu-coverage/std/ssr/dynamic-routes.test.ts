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
import { scanRoutes } from "ekko:rune";
import { matchPath, extractParams } from "ekko:rune/router";
import { mkdir, writeText, remove } from "ekko:fs";

const TEST_DIR = ".ekko-test-dynamic-" + Date.now();

function setup() {
  mkdir(TEST_DIR + "/pages/blog");
  mkdir(TEST_DIR + "/pages/docs");
  mkdir(TEST_DIR + "/pages/users");
  writeText(TEST_DIR + "/pages/index.tsx", "export default function Home(){}");
  writeText(TEST_DIR + "/pages/about.tsx", "export default function About(){}");
  writeText(TEST_DIR + "/pages/blog/[slug].tsx", "export default function Post(p:any){return p;}");
  writeText(TEST_DIR + "/pages/users/[id].tsx", "export default function User(p:any){return p;}");
  writeText(TEST_DIR + "/pages/docs/[...path].tsx", "export default function Doc(p:any){return p;}");
}

function cleanup() {
  try { remove(TEST_DIR, true); } catch(e) {}
}

describe("dynamic route segments", () => {
  test("[slug].tsx maps to /:slug pattern", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const post = routes.find((r: any) => r.pattern === "/blog/:slug");
      expect(post).not.toBe(undefined);
      expect(post.file).toBe("blog/[slug].tsx");
      expect(post.dynamic).toBe(true);
      expect(post.catchAll).toBe(false);
    } finally { cleanup(); }
  });

  test("[id].tsx maps to /users/:id", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const user = routes.find((r: any) => r.pattern === "/users/:id");
      expect(user).not.toBe(undefined);
      expect(user.dynamic).toBe(true);
    } finally { cleanup(); }
  });

  test("[...path].tsx maps to /docs/*path (catch-all)", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const docs = routes.find((r: any) => r.pattern === "/docs/*path");
      expect(docs).not.toBe(undefined);
      expect(docs.file).toBe("docs/[...path].tsx");
      expect(docs.catchAll).toBe(true);
      expect(docs.dynamic).toBe(true);
    } finally { cleanup(); }
  });

  test("static routes have priority 0", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const about = routes.find((r: any) => r.pattern === "/about");
      expect(about.priority).toBe(0);
      expect(about.dynamic).toBe(false);
    } finally { cleanup(); }
  });

  test("dynamic routes have priority 1", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const slug = routes.find((r: any) => r.pattern === "/blog/:slug");
      expect(slug.priority).toBe(1);
    } finally { cleanup(); }
  });

  test("catch-all routes have priority 2", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const docs = routes.find((r: any) => r.pattern === "/docs/*path");
      expect(docs.priority).toBe(2);
    } finally { cleanup(); }
  });

  test("static routes sorted before dynamic", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const staticIdx = routes.findIndex((r: any) => r.pattern === "/about");
      const dynamicIdx = routes.findIndex((r: any) => r.pattern === "/blog/:slug");
      expect(staticIdx < dynamicIdx).toBe(true);
    } finally { cleanup(); }
  });

  test("dynamic routes sorted before catch-all", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const dynamicIdx = routes.findIndex((r: any) => r.pattern === "/blog/:slug");
      const catchAllIdx = routes.findIndex((r: any) => r.pattern === "/docs/*path");
      expect(dynamicIdx < catchAllIdx).toBe(true);
    } finally { cleanup(); }
  });
});

describe("matchPath with dynamic segments", () => {
  test(":param matches any value", () => {
    expect(matchPath("/blog/:slug", "/blog/hello-world")).toBe(true);
    expect(matchPath("/blog/:slug", "/blog/123")).toBe(true);
  });

  test(":param does not match extra segments", () => {
    expect(matchPath("/blog/:slug", "/blog/hello/extra")).toBe(false);
  });

  test(":param does not match missing value", () => {
    expect(matchPath("/blog/:slug", "/blog")).toBe(false);
  });

  test("static takes priority over dynamic (exact match)", () => {
    expect(matchPath("/about", "/about")).toBe(true);
  });

  test("*param matches remaining segments", () => {
    expect(matchPath("/docs/*path", "/docs/a")).toBe(true);
    expect(matchPath("/docs/*path", "/docs/a/b")).toBe(true);
    expect(matchPath("/docs/*path", "/docs/a/b/c")).toBe(true);
  });

  test("*param requires at least one segment", () => {
    expect(matchPath("/docs/*path", "/docs")).toBe(false);
  });
});

describe("extractParams", () => {
  test(":slug extracts single value", () => {
    const p = extractParams("/blog/:slug", "/blog/hello-world");
    expect(p.slug).toBe("hello-world");
  });

  test("multiple :params extracted", () => {
    const p = extractParams("/users/:id/posts/:postId", "/users/42/posts/99");
    expect(p.id).toBe("42");
    expect(p.postId).toBe("99");
  });

  test("*path extracts as array", () => {
    const p = extractParams("/docs/*path", "/docs/a/b/c");
    expect(Array.isArray(p.path)).toBe(true);
    expect(p.path.length).toBe(3);
    expect(p.path[0]).toBe("a");
    expect(p.path[1]).toBe("b");
    expect(p.path[2]).toBe("c");
  });

  test("*path with single segment", () => {
    const p = extractParams("/docs/*path", "/docs/readme");
    expect(p.path.length).toBe(1);
    expect(p.path[0]).toBe("readme");
  });

  test("URL-decoded params", () => {
    const p = extractParams("/blog/:slug", "/blog/hello%20world");
    expect(p.slug).toBe("hello world");
  });
});

