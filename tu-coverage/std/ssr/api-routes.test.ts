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
import { scanRoutes, createApp } from "ekko:rune";
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

describe("createApp api registration", () => {
  test("app.api is a function", () => {
    const app = createApp({ port: 3000 });
    expect(typeof app.api).toBe("function");
  });

  test("app.api returns app (chaining)", () => {
    const app = createApp({ port: 3000 });
    const result = app.api("GET", "/api/health", (req: any) => ({ status: "ok" }));
    expect(result).toBe(app);
  });
});
