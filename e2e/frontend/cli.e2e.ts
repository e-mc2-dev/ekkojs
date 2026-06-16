// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { cli } from "ekko:app/cli";
import { asserter } from "../_harness.ts";

const t = asserter();

function run(setup: (app: any) => void, argv: string[]) {
  let captured: any = "NOT_CALLED";
  const app = cli("t", "1.0");
  setup(app);
  const cmd = app._commands[app._commands.length - 1];
  if (cmd && !cmd._action) cmd.action((a: any) => { captured = a; });
  app.run(argv);
  return captured;
}

t.group("covered — option parsing");
t.eq("boolean flag", run((a) => a.command("go").option("-f, --force", "f"), ["go", "--force"]).force, true);
t.eq("value option", run((a) => a.command("go").option("--name <n>", "n"), ["go", "--name", "alice"]).name, "alice");
t.eq("--key=value", run((a) => a.command("go").option("--name <n>", "n"), ["go", "--name=bob"]).name, "bob");
t.eq("short -n value", run((a) => a.command("go").option("-n, --name <n>", "n"), ["go", "-n", "carol"]).name, "carol");
t.eq("--no-x sets false", run((a) => a.command("go").option("--color", "c"), ["go", "--no-color"]).color, false);
t.eq("number coercion", run((a) => a.command("go").option("--port <p>", "p", { type: "number" }), ["go", "--port", "8080"]).port, 8080);
t.eq("default applied", run((a) => a.command("go").option("--env <e>", "e", { default: "dev" }), ["go"]).env, "dev");
t.eq("positional arg mapped", run((a) => a.command("go <file>"), ["go", "x.txt"]).file, "x.txt");
t.deep("-- passthrough to _", run((a) => a.command("go"), ["go", "--", "a", "-b", "c"])._, ["a", "-b", "c"]);

t.group("covered — colors + definition chaining");
t.check("red wraps ANSI", cli.red("x").includes("\x1b[31m"));
t.check("bold wraps ANSI", cli.bold("x").includes("\x1b[1m"));
t.check("green/yellow/cyan present", cli.green("x").includes("\x1b[32m") && cli.cyan("x").includes("\x1b[36m"));
{
  const app = cli("app", "2.0").description("d").example("app go");
  t.eq("app name", app._name, "app");
  const c = app.command("go <f>").description("go cmd").option("--v", "verbose");
  t.eq("command name parsed", c.name, "go");
  t.eq("command arg required", c.args[0].required, true);
  t.eq("option recorded", c.options[0].long, "v");
}

t.group("recheck (BUG A) — required enforcement");
t.eq("missing required <arg> → action NOT called", run((a) => a.command("go <file>"), ["go"]), "NOT_CALLED");
t.eq("present required <arg> → action called", run((a) => a.command("go <file>"), ["go", "f.txt"]).file, "f.txt");
t.eq("missing required option → action NOT called", run((a) => a.command("go").option("--key <k>", "k", { required: true }), ["go"]), "NOT_CALLED");
t.eq("present required option → action called", run((a) => a.command("go").option("--key <k>", "k", { required: true }), ["go", "--key", "v"]).key, "v");
t.check("optional [arg] absent is fine", run((a) => a.command("go [file]"), ["go"]) !== "NOT_CALLED");
{
  
  t.eq("two required, one missing → not called", run((a) => a.command("cp <src> <dst>"), ["cp", "a"]), "NOT_CALLED");
  t.eq("two required, both present → called", run((a) => a.command("cp <src> <dst>"), ["cp", "a", "b"]).dst, "b");
}
{
  
  let called = "NOT_CALLED";
  const app = cli("t", "1");
  const parent = app.command("db");
  const sub = parent.command("migrate <name>");
  sub.action((a: any) => { called = a; });
  app.run(["db", "migrate"]);
  t.eq("subcommand missing required → not called", called, "NOT_CALLED");
  app.run(["db", "migrate", "init"]);
  t.eq("subcommand required present → called", (called as any).name, "init");
}

t.group("recheck — run() help/version dispatch (no throw)");
t.notThrows("--help does not throw", () => { const a = cli("t", "1"); a.command("go"); a.run(["--help"]); });
t.notThrows("--version does not throw", () => cli("t", "1").run(["--version"]));
t.notThrows("unknown command does not throw", () => { const a = cli("t", "1"); a.command("go"); a.run(["nope"]); });

t.done("ekko:app/cli covered+recheck");
