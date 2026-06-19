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
import { scanRoutes } from "ekko:ssr";
import { mkdir, writeText, remove } from "ekko:fs";

const TEST_DIR = ".ekko-test-routes-" + Date.now();

function setup() {
  mkdir(TEST_DIR + "/pages");
  mkdir(TEST_DIR + "/pages/blog");
  mkdir(TEST_DIR + "/pages/(auth)");
  mkdir(TEST_DIR + "/pages/docs/guides");
  writeText(TEST_DIR + "/pages/index.tsx", "export default function Home(){}");
  writeText(TEST_DIR + "/pages/about.tsx", "export default function About(){}");
  writeText(TEST_DIR + "/pages/blog/index.tsx", "export default function Blog(){}");
  writeText(TEST_DIR + "/pages/blog/post.tsx", "export default function Post(){}");
  writeText(TEST_DIR + "/pages/(auth)/login.tsx", "export default function Login(){}");
  writeText(TEST_DIR + "/pages/(auth)/register.tsx", "export default function Register(){}");
  writeText(TEST_DIR + "/pages/docs/guides/start.tsx", "export default function Start(){}");
  writeText(TEST_DIR + "/pages/contact.js", "export default function Contact(){}");
  writeText(TEST_DIR + "/pages/utils.test.ts", "test('skip', () => {})");
  writeText(TEST_DIR + "/pages/_layout.tsx", "export default function Layout(){}");
  writeText(TEST_DIR + "/pages/style.css", "body{}");
}

function cleanup() {
  try { remove(TEST_DIR, true); } catch(e) {}
}

describe("scanRoutes", () => {
  test("scanRoutes is a function", () => {
    expect(typeof scanRoutes).toBe("function");
  });

  test("returns empty array for missing directory", () => {
    const routes = scanRoutes("/nonexistent-dir-xyz");
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBe(0);
  });

  test("pages/index.tsx maps to /", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const index = routes.find((r: any) => r.pattern === "/");
      expect(index).not.toBe(undefined);
      expect(index.file).toBe("index.tsx");
    } finally { cleanup(); }
  });

  test("pages/about.tsx maps to /about", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const about = routes.find((r: any) => r.pattern === "/about");
      expect(about).not.toBe(undefined);
      expect(about.file).toBe("about.tsx");
    } finally { cleanup(); }
  });

  test("pages/blog/index.tsx maps to /blog", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const blog = routes.find((r: any) => r.pattern === "/blog");
      expect(blog).not.toBe(undefined);
      expect(blog.file).toBe("blog/index.tsx");
    } finally { cleanup(); }
  });

  test("pages/blog/post.tsx maps to /blog/post", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const post = routes.find((r: any) => r.pattern === "/blog/post");
      expect(post).not.toBe(undefined);
      expect(post.file).toBe("blog/post.tsx");
    } finally { cleanup(); }
  });

  test("(auth)/login.tsx maps to /login — group stripped", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const login = routes.find((r: any) => r.pattern === "/login");
      expect(login).not.toBe(undefined);
      expect(login.file).toBe("(auth)/login.tsx");
    } finally { cleanup(); }
  });

  test("(auth)/register.tsx maps to /register — group stripped", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const reg = routes.find((r: any) => r.pattern === "/register");
      expect(reg).not.toBe(undefined);
    } finally { cleanup(); }
  });

  test("nested docs/guides/start.tsx maps to /docs/guides/start", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const start = routes.find((r: any) => r.pattern === "/docs/guides/start");
      expect(start).not.toBe(undefined);
      expect(start.file).toBe("docs/guides/start.tsx");
    } finally { cleanup(); }
  });

  test("contact.js included — .js files supported", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const contact = routes.find((r: any) => r.pattern === "/contact");
      expect(contact).not.toBe(undefined);
      expect(contact.file).toBe("contact.js");
    } finally { cleanup(); }
  });

  test(".test.ts files excluded", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const testFile = routes.find((r: any) => r.file.includes(".test."));
      expect(testFile).toBe(undefined);
    } finally { cleanup(); }
  });

  test("_layout.tsx excluded", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const layout = routes.find((r: any) => r.file.includes("_layout"));
      expect(layout).toBe(undefined);
    } finally { cleanup(); }
  });

  test("non-JS/TS files excluded", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const css = routes.find((r: any) => r.file.includes(".css"));
      expect(css).toBe(undefined);
    } finally { cleanup(); }
  });

  test("routes are sorted alphabetically", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      for (let i = 1; i < routes.length; i++) {
        expect(routes[i].pattern >= routes[i-1].pattern).toBe(true);
      }
    } finally { cleanup(); }
  });

  test("each route has pattern, file, pageKey", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      expect(routes.length > 0).toBe(true);
      for (const r of routes) {
        expect(typeof r.pattern).toBe("string");
        expect(typeof r.file).toBe("string");
        expect(typeof r.pageKey).toBe("string");
        expect(r.pattern.startsWith("/")).toBe(true);
      }
    } finally { cleanup(); }
  });
});
