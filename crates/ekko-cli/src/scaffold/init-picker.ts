// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { prompt, cli } from "ekko:app/cli";

console.log();
console.log("  " + cli.bold(cli.cyan("Create a new EkkoJS project")));
console.log("  " + cli.dim("Use ↑ and ↓ to explore each type, then press Enter to choose."));
console.log();

const TYPES = [
  {
    label: "run    server, script, or CLI app",
    value: "run",
    description:
      "The default choice — a program you start directly with `ekko run`: an HTTP server, a one-off " +
      "script, or a background worker. Scaffolds a small, working web server, already granted the `net` " +
      "permission it needs so it runs without any extra flags.",
  },
  {
    label: "lib    reusable library",
    value: "lib",
    description:
      "Code that other projects install and import. It declares an `exports` map and can be published to " +
      "the registry. Scaffolds a typed module with a sample exported function — no entry point, because a " +
      "library is imported rather than run.",
  },
  {
    label: "cli    command-line tool",
    value: "cli",
    description:
      "An executable that people install and run with `ekko x`. It declares named `bin` commands. Scaffolds " +
      "a CLI built with our own ekko:app/cli framework, showcasing argument parsing, colored output, and the " +
      "full set of interactive prompts (input, password, confirm, select, multi-select, spinner, progress).",
  },
  {
    label: "test   test suite",
    value: "test",
    description:
      "A standalone collection of *.test.ts files — no application of its own — run with `ekko test`. " +
      "Scaffolds example tests using the built-in describe / test / expect framework. Test runs are fully " +
      "trusted, so no permissions are required.",
  },
  {
    label: "gui    native desktop app",
    value: "gui",
    description:
      "A real desktop window that renders a web UI, with two-way messaging between your code and the page, " +
      "launched with `ekko run`. Scaffolds an asgard-styled multi-window demo (broadcast and direct " +
      "messaging, system + custom frames, a system tray), all served over the internal protocol.",
  },
  {
    label: "tui    terminal UI app",
    value: "tui",
    description:
      "A rich, interactive terminal interface — dashboards, wizards, monitors — built from components and " +
      "run with `ekko run`. Scaffolds an offline documentation browser: ten EkkoJS pages plus a TUI that " +
      "reads them, builds a menu, and renders each page with the built-in markdown pipeline.",
  },
  {
    label: "workspace  multi-package repo",
    value: "workspace",
    description:
      "A repository that holds several projects (a library, the app that uses it, a test suite) that import " +
      "each other by name. Writes a workspace `ekko.json` (members + map) into the current directory. After " +
      "that, run `ekko init <type>` inside it and each new project registers itself in the workspace.",
  },
];

const type = await prompt.select("Which kind of project would you like to create?", TYPES);
if (type === null) {
  Ekko.env.set("EKKO_INIT_RESULT", "");
} else {
  const fallback = Ekko.env.get("EKKO_INIT_DEFAULT_NAME") || "my-app";
  let name = await prompt.input("Project name", { default: fallback });
  if (name === null || name.trim() === "") name = fallback;
  Ekko.env.set("EKKO_INIT_RESULT", JSON.stringify({ type, name: name.trim() }));
}
