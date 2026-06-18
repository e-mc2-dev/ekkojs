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
import { scanApiRoutes, scanRoutes, createApp } from "ekko:ssr";
import { mkdir, writeText, remove } from "ekko:fs";

const TEST_DIR = ".ekko-test-api-" + Date.now();

function setup() {
  mkdir(TEST_DIR + "/pages/api");
  mkdir(TEST_DIR + "/pages/api/users");
  mkdir(TEST_DIR + "/pages/api/users/[id]");
  mkdir(TEST_DIR + "/pages/dashboard");
  writeText(TEST_DIR + "/pages/index.tsx", "export default function Home(){}");
  writeText(TEST_DIR + "/pages/api/health.ts", "export function GET(req:any){return {status:'ok'};}");
  writeText(TEST_DIR + "/pages/api/users/index.ts", "export function GET(req:any){return [];}\nexport function POST(req:any){return {created:true};}");
  writeText(TEST_DIR + "/pages/api/users/[id]/index.ts", "export function GET(req:any){return {id:req.params.id};}\nexport function DELETE(req:any){return {deleted:true};}");
  writeText(TEST_DIR + "/pages/dashboard/route.ts", "export function GET(req:any){return {dashboard:true};}");
}

function cleanup() {
  try { remove(TEST_DIR, true); } catch(e) {}
}

describe("scanApiRoutes", () => {
  test("scanApiRoutes is a function", () => {
    expect(typeof scanApiRoutes).toBe("function");
  });

  test("detects files in api/ directory", () => {
    setup();
    try {
      const routes = scanApiRoutes(TEST_DIR + "/pages");
      const health = routes.find((r: any) => r.pattern === "/api/health");
      expect(health).not.toBe(undefined);
      expect(health.file).toBe("api/health.ts");
      expect(health.isApi).toBe(true);
    } finally { cleanup(); }
  });

  test("api/users/index.ts maps to /api/users", () => {
    setup();
    try {
      const routes = scanApiRoutes(TEST_DIR + "/pages");
      const users = routes.find((r: any) => r.pattern === "/api/users");
      expect(users).not.toBe(undefined);
    } finally { cleanup(); }
  });

  test("api/users/[id]/index.ts maps to /api/users/:id", () => {
    setup();
    try {
      const routes = scanApiRoutes(TEST_DIR + "/pages");
      const user = routes.find((r: any) => r.pattern === "/api/users/:id");
      expect(user).not.toBe(undefined);
    } finally { cleanup(); }
  });

  test("route.ts file detected and mapped", () => {
    setup();
    try {
      const routes = scanApiRoutes(TEST_DIR + "/pages");
      const dash = routes.find((r: any) => r.pattern === "/dashboard");
      expect(dash).not.toBe(undefined);
      expect(dash.file).toBe("dashboard/route.ts");
      expect(dash.isRoute).toBe(true);
    } finally { cleanup(); }
  });

  test("route.ts stripped from URL pattern", () => {
    setup();
    try {
      const routes = scanApiRoutes(TEST_DIR + "/pages");
      const hasRoute = routes.find((r: any) => r.pattern.includes("route"));
      expect(hasRoute).toBe(undefined);
    } finally { cleanup(); }
  });

  test("non-api/non-route files excluded", () => {
    setup();
    try {
      const routes = scanApiRoutes(TEST_DIR + "/pages");
      const index = routes.find((r: any) => r.file === "index.tsx");
      expect(index).toBe(undefined);
    } finally { cleanup(); }
  });
});

describe("scanRoutes excludes route.ts", () => {
  test("route.ts excluded from page routes", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const routeFile = routes.find((r: any) => r.file.includes("route.ts"));
      expect(routeFile).toBe(undefined);
    } finally { cleanup(); }
  });

  test("api/ files still show as page routes (api pages)", () => {
    setup();
    try {
      const routes = scanRoutes(TEST_DIR + "/pages");
      const health = routes.find((r: any) => r.pattern === "/api/health");
      expect(health).not.toBe(undefined);
    } finally { cleanup(); }
  });
});

describe("createApp apiRoutes method", () => {
  test("app.apiRoutes is a function", () => {
    const app = createApp({ port: 3000 });
    expect(typeof app.apiRoutes).toBe("function");
  });

  test("app.apiRoutes returns app (chaining)", () => {
    const app = createApp({ port: 3000 });
    const result = app.apiRoutes("nonexistent-dir", {});
    expect(result).toBe(app);
  });
});
