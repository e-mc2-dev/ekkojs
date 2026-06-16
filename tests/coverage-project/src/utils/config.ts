// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export interface AppConfig {
  name: string;
  version: string;
  debug: boolean;
  port: number;
  allowedOrigins: string[];
}

const defaults: AppConfig = {
  name: "app",
  version: "1.0.0",
  debug: false,
  port: 8080,
  allowedOrigins: ["*"],
};

export function createConfig(overrides: Partial<AppConfig>): AppConfig {
  return { ...defaults, ...overrides };
}

export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (!config.name || config.name.length === 0) {
    errors.push("name is required");
  }

  if (config.port < 1 || config.port > 65535) {
    errors.push("port must be between 1 and 65535");
  }

  if (config.allowedOrigins.length === 0) {
    errors.push("at least one origin is required");
  }

  if (config.debug && config.allowedOrigins.includes("*")) {
    errors.push("wildcard origin not allowed in debug mode");
  }

  return errors;
}

export function mergeConfigs(base: AppConfig, override: Partial<AppConfig>): AppConfig {
  return {
    ...base,
    ...override,
    allowedOrigins: override.allowedOrigins || base.allowedOrigins,
  };
}
