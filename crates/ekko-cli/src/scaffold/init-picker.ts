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
console.log("  " + cli.dim("Use ↑ and ↓ to explore each option, then press Enter to choose."));
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
    label: "rune   full-stack web app (SSR + React)",
    value: "rune",
    description:
      "EkkoJS's first-class full-stack framework: server-rendered React with file-based routing, Mimir " +
      "state that survives navigation and reloads, and zero-network client navigation. Scaffolds a polished, " +
      "EkkoJS-branded site you build with `ekko build --client` and serve with `ekko run server.tsx`.",
  },
  {
    label: "web    static / client-side app",
    value: "web",
    description:
      "A pure client-side app (no SSR): index.html plus src/main.ts bundled to dist/ with `ekko build`, " +
      "served by ekko:web with an SPA fallback. Pick the `static` template for a client-only app, or `api` " +
      "to add a same-origin JSON API the client fetches.",
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
      "launched with `ekko run`. Choose a single-window starter or the full multi-window demo (broadcast and " +
      "direct messaging, system + custom frames, a system tray), all served over the internal protocol.",
  },
  {
    label: "tui    terminal UI app",
    value: "tui",
    description:
      "A rich, interactive terminal interface — dashboards, wizards, monitors — built from components and " +
      "run with `ekko run`. Choose the offline documentation browser starter or a showcase of every TUI " +
      "component, rendered with the built-in markdown pipeline.",
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

interface Variant { id: string; label: string; description: string }
const registry: Record<string, Variant[]> = JSON.parse(Ekko.env.get("EKKO_INIT_TEMPLATES") || "{}");
const presetKind = Ekko.env.get("EKKO_INIT_KIND") || "";
const presetName = Ekko.env.get("EKKO_INIT_NAME") || "";
const presetTemplate = Ekko.env.get("EKKO_INIT_TEMPLATE") || "";

function abort(): void { Ekko.env.set("EKKO_INIT_RESULT", ""); }

const type = presetKind || (await prompt.select("Which kind of project would you like to create?", TYPES));
if (type === null) {
  abort();
} else {
  
  const variants = registry[type] || [];
  let template: string | null = presetTemplate || null;
  let aborted = false;
  if (!template) {
    if (variants.length > 1) {
      template = await prompt.select(
        "Which template?",
        variants.map((v) => ({ label: v.label, value: v.id, description: v.description })),
      );
      if (template === null) { abort(); aborted = true; }
    } else if (variants.length === 1) {
      template = variants[0].id;
    }
  }

  if (!aborted) {
    
    let name = presetName;
    if (!name) {
      const fallback = Ekko.env.get("EKKO_INIT_DEFAULT_NAME") || "my-app";
      const entered = await prompt.input("Project name", { default: fallback });
      name = entered === null || entered.trim() === "" ? fallback : entered;
    }
    Ekko.env.set("EKKO_INIT_RESULT", JSON.stringify({ type, template, name: name.trim() }));
  }
}
