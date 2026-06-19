// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { cli, prompt } from "ekko:app/cli";

const app = cli("{{NAME}}", "1.0.0");

app
  .description("A friendly EkkoJS command-line tool, your starting point.")
  
  .example("{{NAME}} greet Ada --loud")
  .example("{{NAME}} setup");

app
  .command("greet <name>")
  .description("Greet someone, optionally loudly and more than once.")
  .option("--loud, -l", "Shout the greeting (UPPERCASE)")
  .option("--repeat, -r <n>", "How many times to greet", { type: "number", default: 1 })
  .option("--color, -c <name>", "Colour of the greeting", { default: "cyan" })
  .example("{{NAME}} greet Grace --color magenta --repeat 3")
  .action((args) => {

    const paint = (cli as any)[args.color] || cli.cyan; 
    const base = `Hello, ${args.name}!`;
    const text = args.loud ? base.toUpperCase() : base;

    for (let i = 0; i < args.repeat; i++) {
      console.log(paint(text));
    }
  });

app
  .command("palette")
  .description("Print the built-in colours and text styles.")
  .action(() => {
    console.log(cli.bold("\nColours"));
    console.log(
      [
        cli.red("red"), cli.green("green"), cli.yellow("yellow"), cli.blue("blue"),
        cli.magenta("magenta"), cli.cyan("cyan"), cli.white("white"), cli.gray("gray"),
      ].join("  "),
    );

    console.log(cli.bold("\nStyles"));
    console.log(
      [
        cli.bold("bold"), cli.dim("dim"), cli.italic("italic"),
        cli.underline("underline"), cli.inverse("inverse"), cli.strikethrough("strike"),
      ].join("  "),
    );
    console.log("");
  });

app
  .command("setup")
  .description("Run an interactive setup wizard (demonstrates every prompt).")
  .action(async () => {
    console.log(cli.bold(cli.cyan("\n  Project setup\n")));

    const name = await prompt.input("Project name", { default: "my-project" });
    if (name === null) return console.log(cli.dim("Cancelled."));

    const token = await prompt.password("API token (hidden)");
    if (token === null) return console.log(cli.dim("Cancelled."));

    
    const theme = await prompt.select("Pick a colour theme", [
      { label: "Ocean", value: "ocean", description: "Calm blues and teals." },
      { label: "Sunset", value: "sunset", description: "Warm reds and oranges." },
      { label: "Forest", value: "forest", description: "Deep greens." },
    ]);
    if (theme === null) return console.log(cli.dim("Cancelled."));

    
    const features = await prompt.multiSelect("Enable features (space to toggle)", [
      { label: "Linting", value: "lint", checked: true },
      { label: "Formatting", value: "format", checked: true },
      { label: "Git hooks", value: "hooks" },
      { label: "CI workflow", value: "ci" },
    ]);
    if (features === null) return console.log(cli.dim("Cancelled."));

    const ok = await prompt.confirm("Create the project now?", { default: true });
    if (ok === null) return console.log(cli.dim("Cancelled."));
    if (!ok) return console.log(cli.yellow("\nNo changes made."));

    
    const spin = prompt.spinner("Creating files...");
    await sleep(900);
    spin.success("Files created");

    const steps = ["dependencies", "config", "templates", "git"];
    const bar = prompt.progress("Installing", { total: steps.length });
    for (let i = 0; i < steps.length; i++) {
      await sleep(450);
      bar.update(i + 1);
    }
    bar.done("Setup complete");

    console.log(cli.bold("\n  Summary"));
    console.log("  " + cli.dim("name    ") + cli.white(name));
    console.log("  " + cli.dim("token   ") + cli.white("•".repeat(Math.min(token.length, 12))));
    console.log("  " + cli.dim("theme   ") + cli.cyan(String(theme)));
    console.log("  " + cli.dim("features") + " " + cli.green((features as string[]).join(", ") || "none"));
    console.log("");
  });

const tasks: string[] = [];
const task = app.command("task").description("Manage a tiny in-memory to-do list.");

task
  .command("add <text>")
  .description("Add a task to the list.")
  .action((args) => {
    tasks.push(args.text);
    console.log(cli.green("✓ added: ") + args.text);
  });

task
  .command("list")
  .description("Show every task.")
  .action(() => {
    if (tasks.length === 0) {
      console.log(cli.dim("No tasks yet. Add one with `{{NAME}} task add \"...\"`."));
      return;
    }
    tasks.forEach((t, i) => console.log(cli.yellow(`${i + 1}.`) + " " + t));
  });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await app.run();
