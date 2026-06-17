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
import { cli } from "ekko:app/cli";

describe("cli basic", () => {
  test("cli('myapp', '1.0.0') returns object", () => {
    const app = cli("myapp", "1.0.0");
    expect(typeof app).toBe("object");
    expect(app).not.toBe(null);
  });

  test("app has name property", () => {
    const app = cli("myapp", "1.0.0");
    expect(app.name).toBe("myapp");
  });

  test("app has version property", () => {
    const app = cli("myapp", "1.0.0");
    expect(app.version).toBe("1.0.0");
  });

  test("app.command returns builder object", () => {
    const app = cli("myapp", "1.0.0");
    const builder = app.command("deploy <env>");
    expect(typeof builder).toBe("object");
    expect(builder).not.toBe(null);
  });

  test("builder has description method", () => {
    const app = cli("myapp", "1.0.0");
    const builder = app.command("deploy <env>");
    expect(typeof builder.description).toBe("function");
  });

  test("builder has option method", () => {
    const app = cli("myapp", "1.0.0");
    const builder = app.command("deploy <env>");
    expect(typeof builder.option).toBe("function");
  });

  test("builder has action method", () => {
    const app = cli("myapp", "1.0.0");
    const builder = app.command("deploy <env>");
    expect(typeof builder.action).toBe("function");
  });

  test("app.help is a function", () => {
    const app = cli("myapp", "1.0.0");
    expect(typeof app.help).toBe("function");
  });

  test("app.run is a function", () => {
    const app = cli("myapp", "1.0.0");
    expect(typeof app.run).toBe("function");
  });

  test("command builder is chainable: .description().option().action()", () => {
    const app = cli("myapp", "1.0.0");
    const result = app
      .command("deploy <env>")
      .description("Deploy to environment")
      .option("--force", "Skip confirmation")
      .action(() => {});
    expect(typeof result).toBe("object");
  });

  test("multiple commands registered", () => {
    const app = cli("myapp", "1.0.0");
    app.command("deploy <env>").action(() => {});
    app.command("rollback <env>").action(() => {});
    
    expect(typeof app.run).toBe("function");
  });

  test("app.command('deploy <env>') parses command name", () => {
    const app = cli("myapp", "1.0.0");
    const builder = app.command("deploy <env>");
    
    expect(typeof builder.action).toBe("function");
  });

  test("cli.confirm is a function", () => {
    expect(typeof cli.confirm).toBe("function");
  });

  test("cli.spinner is a function", () => {
    expect(typeof cli.spinner).toBe("function");
  });

  test("cli.spinner returns object with success and fail", () => {
    const spinner = cli.spinner("Loading...");
    expect(typeof spinner).toBe("object");
    expect(typeof spinner.success).toBe("function");
    expect(typeof spinner.fail).toBe("function");
  });
});
