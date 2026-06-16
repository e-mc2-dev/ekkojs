// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { test, expect, describe } from "ekko:test";
import { createConfig, validateConfig } from "../src/utils/config.ts";

describe("config", () => {
  test("createConfig defaults", () => {
    const cfg = createConfig({});
    expect(cfg.name).toBe("app");
    expect(cfg.port).toBe(8080);
  });

  test("createConfig override", () => {
    const cfg = createConfig({ name: "myapp", port: 3000 });
    expect(cfg.name).toBe("myapp");
    expect(cfg.port).toBe(3000);
  });

  test("validate valid config", () => {
    const cfg = createConfig({ name: "test" });
    const errors = validateConfig(cfg);
    expect(errors).toHaveLength(0);
  });

  test("validate empty name", () => {
    const cfg = createConfig({ name: "" });
    const errors = validateConfig(cfg);
    expect(errors).toContain("name is required");
  });

  test("validate bad port", () => {
    const cfg = createConfig({ port: 0 });
    const errors = validateConfig(cfg);
    expect(errors).toContain("port must be between 1 and 65535");
  });

  
});
