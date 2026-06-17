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
import { scanRoutes, scanLayouts, composeLayouts, createApp } from "ekko:ssr";
import { mkdir, writeText, remove } from "ekko:fs";

const TEST_DIR = ".ekko-test-conventions-" + Date.now();

function setup() {
  mkdir(TEST_DIR + "/app");
  mkdir(TEST_DIR + "/app/blog");
  mkdir(TEST_DIR + "/app/dashboard");
  writeText(TEST_DIR + "/app/layout.tsx", "export default function RootLayout({children}:any){return children;}");
  writeText(TEST_DIR + "/app/error.tsx", "export default function RootError({error}:any){return 'Error: '+error.message;}");
  writeText(TEST_DIR + "/app/not-found.tsx", "export default function NotFound(){return '404 — Page not found';}");
  writeText(TEST_DIR + "/app/loading.tsx", "export default function Loading(){return 'Loading...';}");
  writeText(TEST_DIR + "/app/index.tsx", "export default function Home(){return 'Home';}");
  writeText(TEST_DIR + "/app/about.tsx", "export default function About(){return 'About';}");
  writeText(TEST_DIR + "/app/blog/layout.tsx", "export default function BlogLayout({children}:any){return '<nav>Blog</nav>'+children;}");
  writeText(TEST_DIR + "/app/blog/index.tsx", "export default function Blog(){return 'Blog list';}");
  writeText(TEST_DIR + "/app/blog/[slug].tsx", "export default function Post(){return 'Post';}");
  writeText(TEST_DIR + "/app/dashboard/error.tsx", "export default function DashError({error}:any){return 'Dashboard error: '+error.message;}");
  writeText(TEST_DIR + "/app/dashboard/index.tsx", "export default function Dash(){return 'Dashboard';}");
}

function cleanup() {
  try { remove(TEST_DIR, true); } catch(e) {}
}

describe("scanLayouts", () => {
  test("scanLayouts is a function", () => {
    expect(typeof scanLayouts).toBe("function");
  });

  test("detects root layout.tsx", () => {
    setup();
    try {
      const tree = scanLayouts(TEST_DIR + "/app");
      expect(tree[""]).not.toBe(undefined);
      expect(tree[""].layouts.length).toBe(1);
      expect(tree[""].layouts[0].file).toBe("layout.tsx");
    } finally { cleanup(); }
  });

  test("detects root error.tsx", () => {
    setup();
    try {
      const tree = scanLayouts(TEST_DIR + "/app");
      expect(tree[""].error).toBe("error.tsx");
    } finally { cleanup(); }
  });

  test("detects root not-found.tsx", () => {
    setup();
    try {
      const tree = scanLayouts(TEST_DIR + "/app");
      expect(tree[""].notFound).toBe("not-found.tsx");
    } finally { cleanup(); }
  });

  test("detects root loading.tsx", () => {
    setup();
    try {
      const tree = scanLayouts(TEST_DIR + "/app");
      expect(tree[""].loading).toBe("loading.tsx");
    } finally { cleanup(); }
  });

  test("detects nested blog/layout.tsx", () => {
    setup();
    try {
      const tree = scanLayouts(TEST_DIR + "/app");
      expect(tree["blog"]).not.toBe(undefined);
      expect(tree["blog"].layouts.length).toBe(1);
      expect(tree["blog"].layouts[0].file).toBe("blog/layout.tsx");
    } finally { cleanup(); }
  });

  test("detects nested dashboard/error.tsx", () => {
    setup();
    try {
      const tree = scanLayouts(TEST_DIR + "/app");
      expect(tree["dashboard"]).not.toBe(undefined);
      expect(tree["dashboard"].error).toBe("dashboard/error.tsx");
    } finally { cleanup(); }
  });
});

describe("scanRoutes excludes convention files", () => {
  test("layout.tsx excluded from routes", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/app");
      const layout = routes.find((r: any) => r.file.includes("layout"));
      expect(layout).toBe(undefined);
    } finally { cleanup(); }
  });

  test("error.tsx excluded from routes", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/app");
      const error = routes.find((r: any) => r.file.includes("error"));
      expect(error).toBe(undefined);
    } finally { cleanup(); }
  });

  test("not-found.tsx excluded from routes", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/app");
      const nf = routes.find((r: any) => r.file.includes("not-found"));
      expect(nf).toBe(undefined);
    } finally { cleanup(); }
  });

  test("loading.tsx excluded from routes", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/app");
      const loading = routes.find((r: any) => r.file.includes("loading"));
      expect(loading).toBe(undefined);
    } finally { cleanup(); }
  });

  test("regular pages still included", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/app");
      const index = routes.find((r: any) => r.pattern === "/");
      const about = routes.find((r: any) => r.pattern === "/about");
      expect(index).not.toBe(undefined);
      expect(about).not.toBe(undefined);
    } finally { cleanup(); }
  });
});

describe("composeLayouts", () => {
  test("composeLayouts is a function", () => {
    expect(typeof composeLayouts).toBe("function");
  });

  test("wraps content with root layout", () => {
    const tree = {
      "": { layouts: [{ segment: "", file: "layout.tsx", render: (p: any) => _jsx("div", { className: "root", children: p.children }) }], error: null, loading: null, notFound: null },
    };
    const result = composeLayouts(tree, "/about", "<p>About</p>");
    expect(result.includes("root")).toBe(true);
    expect(result.includes("About")).toBe(true);
  });

  test("nests segment layout inside root layout", () => {
    const tree = {
      "": { layouts: [{ segment: "", file: "layout.tsx", render: (p: any) => _jsx("div", { className: "root", children: p.children }) }], error: null, loading: null, notFound: null },
      "blog": { layouts: [{ segment: "blog", file: "blog/layout.tsx", render: (p: any) => _jsx("section", { className: "blog", children: p.children }) }], error: null, loading: null, notFound: null },
    };
    const result = composeLayouts(tree, "/blog", "<p>Post</p>");
    expect(result.includes("root")).toBe(true);
    expect(result.includes("blog")).toBe(true);
    expect(result.includes("Post")).toBe(true);
  });

  test("returns page html when no layouts", () => {
    const tree = {};
    const result = composeLayouts(tree, "/about", "<p>About</p>");
    expect(result).toBe("<p>About</p>");
  });
});

describe("createApp with conventions", () => {
  test("createApp accepts notFound option", () => {
    const app = createApp({
      port: 3000,
      notFound: () => _jsx("h1", { children: "Not Found" }),
    });
    expect(typeof app).toBe("object");
  });

  test("createApp accepts error option", () => {
    const app = createApp({
      port: 3000,
      error: (p: any) => _jsx("h1", { children: "Error: " + p.message }),
    });
    expect(typeof app).toBe("object");
  });

  test("createApp accepts layouts option", () => {
    const tree = { "": { layouts: [], error: null, loading: null, notFound: null } };
    const app = createApp({ port: 3000, layouts: tree });
    expect(typeof app).toBe("object");
  });
});
