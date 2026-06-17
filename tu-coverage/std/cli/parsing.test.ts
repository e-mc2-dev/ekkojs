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

describe("cli argument parsing", () => {
  test("run(['cmd']) invokes command's action", () => {
    const app = cli("myapp", "1.0.0");
    let called = false;
    app.command("deploy").action(() => { called = true; });
    app.run(["deploy"]);
    expect(called).toBe(true);
  });

  test("run(['cmd', 'arg1']) passes positional arg", () => {
    const app = cli("myapp", "1.0.0");
    let received: any = null;
    app.command("deploy <env>").action((opts: any) => { received = opts; });
    app.run(["deploy", "prod"]);
    expect(received.env).toBe("prod");
  });

  test("run(['cmd', '--flag']) sets flag to true", () => {
    const app = cli("myapp", "1.0.0");
    let received: any = null;
    app.command("deploy")
      .option("--force", "Skip confirmation")
      .action((opts: any) => { received = opts; });
    app.run(["deploy", "--force"]);
    expect(received.force).toBe(true);
  });

  test("run(['cmd', '--name', 'value']) sets named option", () => {
    const app = cli("myapp", "1.0.0");
    let received: any = null;
    app.command("deploy")
      .option("--tag <tag>", "Docker tag")
      .action((opts: any) => { received = opts; });
    app.run(["deploy", "--tag", "v1.2.3"]);
    expect(received.tag).toBe("v1.2.3");
  });

  test("run(['cmd', 'pos1', '--opt', 'val']) mixed positional + options", () => {
    const app = cli("myapp", "1.0.0");
    let received: any = null;
    app.command("deploy <env>")
      .option("--tag <tag>", "Docker tag")
      .action((opts: any) => { received = opts; });
    app.run(["deploy", "staging", "--tag", "latest"]);
    expect(received.env).toBe("staging");
    expect(received.tag).toBe("latest");
  });

  test("multiple positional args parsed in order", () => {
    const app = cli("myapp", "1.0.0");
    let received: any = null;
    app.command("copy <src> <dst>").action((opts: any) => { received = opts; });
    app.run(["copy", "file1.txt", "file2.txt"]);
    expect(received.src).toBe("file1.txt");
    expect(received.dst).toBe("file2.txt");
  });

  test("boolean flags (no value)", () => {
    const app = cli("myapp", "1.0.0");
    let received: any = null;
    app.command("build")
      .option("--verbose", "Verbose output", { type: "boolean" })
      .option("--minify", "Minify output", { type: "boolean" })
      .action((opts: any) => { received = opts; });
    app.run(["build", "--verbose", "--minify"]);
    expect(received.verbose).toBe(true);
    expect(received.minify).toBe(true);
  });

  test("short flags (-f) parsed", () => {
    const app = cli("myapp", "1.0.0");
    let received: any = null;
    app.command("deploy")
      .option("-f, --force", "Force deploy")
      .action((opts: any) => { received = opts; });
    app.run(["deploy", "-f"]);
    
    expect(received.f).toBe(true);
  });

  test("unknown command shows help (doesn't crash)", () => {
    const app = cli("myapp", "1.0.0");
    app.command("deploy").action(() => {});
    
    const fn = () => app.run(["nonexistent"]);
    expect(fn).not.toThrow();
  });

  test("empty argv shows help (doesn't crash)", () => {
    const app = cli("myapp", "1.0.0");
    app.command("deploy").action(() => {});
    const fn = () => app.run([]);
    expect(fn).not.toThrow();
  });

  test("--help shows help (doesn't crash)", () => {
    const app = cli("myapp", "1.0.0");
    app.command("deploy").action(() => {});
    const fn = () => app.run(["--help"]);
    expect(fn).not.toThrow();
  });

  test("action receives parsed object", () => {
    const app = cli("myapp", "1.0.0");
    let received: any = null;
    app.command("deploy <env>")
      .option("--force", "Force")
      .action((opts: any) => { received = opts; });
    app.run(["deploy", "prod", "--force"]);
    expect(typeof received).toBe("object");
    expect(received).not.toBe(null);
  });

  test("action receives positional in object by param name", () => {
    const app = cli("myapp", "1.0.0");
    let received: any = null;
    app.command("greet <name>").action((opts: any) => { received = opts; });
    app.run(["greet", "Alice"]);
    expect(received.name).toBe("Alice");
  });

  test("multiple options parsed correctly", () => {
    const app = cli("myapp", "1.0.0");
    let received: any = null;
    app.command("deploy")
      .option("--tag <tag>", "Tag")
      .option("--region <region>", "Region")
      .option("--force", "Force")
      .action((opts: any) => { received = opts; });
    app.run(["deploy", "--tag", "v2", "--region", "us-east-1", "--force"]);
    expect(received.tag).toBe("v2");
    expect(received.region).toBe("us-east-1");
    expect(received.force).toBe(true);
  });

  test("command with no action doesn't crash", () => {
    const app = cli("myapp", "1.0.0");
    app.command("noop");
    const fn = () => app.run(["noop"]);
    expect(fn).not.toThrow();
  });
});
