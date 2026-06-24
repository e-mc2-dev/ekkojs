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

function showColors() {
  console.log(cli.bold("\n  Foreground colours\n"));
  console.log(
    "  " + [
      cli.red("red"), cli.green("green"), cli.yellow("yellow"), cli.blue("blue"),
      cli.magenta("magenta"), cli.cyan("cyan"), cli.white("white"), cli.gray("gray"),
    ].join("  "),
  );
  console.log(cli.dim("\n  Each helper takes a string and returns it wrapped in ANSI, so you compose"));
  console.log(cli.dim("  them and pass the result to console.log: cli.bold(cli.green(\"done\")).\n"));
}

function showStyles() {
  console.log(cli.bold("\n  Text styles\n"));
  console.log(
    "  " + [
      cli.bold("bold"), cli.dim("dim"), cli.italic("italic"),
      cli.underline("underline"), cli.inverse("inverse"), cli.strikethrough("strike"),
    ].join("  "),
  );
  console.log("");
}

async function demoInput() {
  const name = await prompt.input("Project name", { default: "my-app" });
  if (name === null) return cancelled();
  console.log("  " + cli.dim("you typed ") + cli.white(name));
}

async function demoPassword() {
  const token = await prompt.password("API token (hidden)");
  if (token === null) return cancelled();
  console.log("  " + cli.dim("captured ") + cli.white("•".repeat(Math.min(token.length, 16))));
}

async function demoConfirm() {
  const ok = await prompt.confirm("Deploy to production?", { default: false });
  if (ok === null) return cancelled();
  console.log("  " + (ok ? cli.green("confirmed") : cli.yellow("declined")));
}

async function demoSelect() {
  const theme = await prompt.select("Pick a colour theme", [
    { label: "Ocean", value: "ocean", description: "Calm blues and teals." },
    { label: "Sunset", value: "sunset", description: "Warm reds and oranges." },
    { label: "Forest", value: "forest", description: "Deep greens and browns." },
  ]);
  if (theme === null) return cancelled();
  console.log("  " + cli.dim("selected ") + cli.cyan(String(theme)));
}

async function demoMultiselect() {
  const features = await prompt.multiSelect("Enable features (space to toggle, a for all)", [
    { label: "TypeScript", value: "ts", checked: true },
    { label: "Linting", value: "lint", checked: true },
    { label: "Unit tests", value: "test" },
    { label: "GitHub Actions", value: "ci" },
  ]);
  if (features === null) return cancelled();
  console.log("  " + cli.dim("selected ") + cli.green((features as string[]).join(", ") || "none"));
}

async function demoProgress() {
  const steps = ["dependencies", "config", "templates", "git"];
  const bar = prompt.progress("Installing", { total: steps.length });
  for (let i = 0; i < steps.length; i++) {
    await sleep(400);
    bar.update(i + 1);
  }
  bar.done("Install complete");
}

async function demoSpinner() {
  const spin = prompt.spinner("Building project…");
  await sleep(1200);
  spin.success("Build finished");
}

async function demoGreet() {
  const name = await prompt.input("Who should I greet?", { default: "Ada" });
  if (name === null) return cancelled();
  console.log("  " + cli.bold(cli.cyan(`Hello, ${name}!`)));
}

function cancelled() {
  console.log("  " + cli.dim("cancelled"));
}

type Demo = { label: string; description: string; run: () => void | Promise<void> };

const PROMPTS: Record<string, Demo> = {
  input:       { label: "prompt.input",       description: "A single line of text, with an optional default.", run: demoInput },
  password:    { label: "prompt.password",    description: "Masked text entry for secrets.",                   run: demoPassword },
  confirm:     { label: "prompt.confirm",     description: "A yes/no question returning a boolean.",            run: demoConfirm },
  select:      { label: "prompt.select",      description: "Pick one item with the arrow keys.",                run: demoSelect },
  multiselect: { label: "prompt.multiSelect", description: "Pick several with the spacebar.",                   run: demoMultiselect },
  progress:    { label: "prompt.progress",    description: "A determinate progress bar you advance.",           run: demoProgress },
  spinner:     { label: "prompt.spinner",     description: "An animated indicator for indeterminate work.",     run: demoSpinner },
};

const SHOW: Record<string, Demo> = {
  colors: { label: "Colours", description: "The 8 foreground colour helpers.", run: showColors },
  styles: { label: "Styles",  description: "The 6 text style helpers.",        run: showStyles },
};

const app = cli("{{NAME}}", "1.0.0");
app
  .description("A guided tour of ekko:app/cli. Run with no arguments for the menu.")
  .example("{{NAME}}                 (open the interactive menu)")
  .example("{{NAME}} show colors")
  .example("{{NAME}} prompt select")
  .example("{{NAME}} greet Ada --loud --repeat 2");

app
  .command("greet <name>")
  .description("Greet someone, optionally loudly and more than once.")
  .option("--loud, -l", "Shout the greeting in uppercase")
  .option("--repeat, -r <n>", "How many times to greet", { type: "number", default: 1 })
  .option("--color, -c <name>", "Colour of the greeting", { default: "cyan" })
  .example("{{NAME}} greet Grace --color magenta --repeat 3")
  .action((args) => {
    const paint = (cli as any)[args.color] || cli.cyan;
    const base = `Hello, ${args.name}!`;
    const text = args.loud ? base.toUpperCase() : base;
    for (let i = 0; i < args.repeat; i++) console.log(paint(text));
  });

app
  .command("show <what>")
  .description("Print the colour or style helpers (what: colors, styles).")
  .example("{{NAME}} show colors")
  .action(async (args) => {
    const demo = SHOW[String(args.what).toLowerCase()];
    if (!demo) return unknown(args.what, Object.keys(SHOW));
    await demo.run();
  });

app
  .command("prompt <name>")
  .description("Run one prompt demo (name: input, password, confirm, select, multiselect, progress, spinner).")
  .example("{{NAME}} prompt multiselect")
  .action(async (args) => {
    const demo = PROMPTS[String(args.name).toLowerCase()];
    if (!demo) return unknown(args.name, Object.keys(PROMPTS));
    await demo.run();
  });

app
  .command("menu")
  .description("Open the interactive menu of every demo.")
  .action(runMenu);

const tasks: string[] = [];
const task = app.command("task").description("Manage a tiny in-memory to-do list.");
task
  .command("add <text>")
  .description("Add a task to the list.")
  .action((args) => { tasks.push(args.text); console.log(cli.green("✓ added: ") + args.text); });
task
  .command("list")
  .description("Show every task.")
  .action(() => {
    if (tasks.length === 0) return console.log(cli.dim("No tasks yet."));
    tasks.forEach((t, i) => console.log(cli.yellow(`${i + 1}.`) + " " + t));
  });

function banner() {
  const title = "{{NAME}} · ekko:app/cli showcase";
  const sub = "A guided tour: commands, colours, and prompts";
  const inner = Math.max(title.length, sub.length) + 2;           
  const pad = (s: string) => " " + s + " ".repeat(inner - 1 - s.length);
  const cy = cli.cyan;
  console.log("");
  console.log(cy("╭" + "─".repeat(inner) + "╮"));
  console.log(cy("│") + cli.bold(cy(pad(title))) + cy("│"));
  console.log(cy("│") + cli.dim(pad(sub)) + cy("│"));
  console.log(cy("╰" + "─".repeat(inner) + "╯"));
  console.log("");
}

async function runMenu() {
  const entries = [
    ...Object.entries(SHOW).map(([k, d]) => ({ key: "show:" + k, ...d })),
    ...Object.entries(PROMPTS).map(([k, d]) => ({ key: "prompt:" + k, ...d })),
    { key: "demo:greet", label: "greet", description: "A greeting built from an input prompt.", run: demoGreet },
  ];
  banner();
  
  const choices = [
    ...entries.map((e) => ({ label: e.label, value: e.key, description: e.description })),
    { label: cli.red("Exit demo"), value: "__exit", description: "Leave the showcase." },
  ];
  while (true) {
    const choice = await prompt.select("Choose a demo", choices, { pageSize: 14 });
    if (choice === null || choice === "__exit") { console.log(cli.dim("\n  Goodbye.\n")); return; }
    const picked = entries.find((e) => e.key === choice);
    if (picked) await picked.run();
    console.log(""); 
  }
}

function unknown(name: unknown, valid: string[]) {
  console.error(cli.red("Unknown: ") + String(name));
  console.log(cli.dim("Try one of: ") + valid.join(", "));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function userArgv(): string[] {
  const raw = Ekko.args;
  let start = 0;
  for (let i = 0; i < raw.length; i++) if (/\.(ts|js|tsx|jsx|mjs)$/.test(raw[i])) { start = i + 1; break; }
  if (start === 0) for (let i = 0; i < raw.length; i++) if (raw[i] === "x" && i + 1 < raw.length) { start = i + 2; break; }
  if (start === 0) start = 2;
  const argv = raw.slice(start);
  return argv[0] === "--" ? argv.slice(1) : argv; 
}

if (userArgv().length === 0) await runMenu();
else await app.run();
