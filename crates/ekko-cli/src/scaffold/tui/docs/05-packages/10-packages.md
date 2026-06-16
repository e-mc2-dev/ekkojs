# Packages and the Registry

EkkoJS has a built in workflow for *starting* projects, *adding* dependencies,
and *publishing* your own packages. Project metadata lives in a single
**`ekko.json`** file.

## Starting a project

`ekko init` scaffolds a ready to run project. Templates exist for several app
shapes, including the terminal UI scaffold that ships these docs:

```bash
ekko init
ekko init tui
```

## Project metadata

A minimal `ekko.json` looks like this:

```json
{
  "name": "my-app",
  "version": "0.1.0",
  "main": "main.ts",
  "permissions": {
    "fs": ["./data"],
    "net": true
  }
}
```

- **`name`** and **`version`** identify the package in the registry.
- **`main`** is the default entry file.
- **`permissions`** declares the capabilities the project runs with.

## Adding dependencies

Install a package from the registry with:

```bash
ekko add @ekko/asgard
```

The dependency is recorded in `ekko.json` and resolved on the next run.

## Publishing

When your package is ready, share it:

```bash
ekko publish
```

| Command         | What it does                          |
| --------------- | ------------------------------------- |
| `ekko init`     | Scaffold a new project                |
| `ekko add`      | Install a dependency                  |
| `ekko publish`  | Publish a package to the registry     |
| `ekko x <name>` | Run a command line tool by name       |

> Keep `ekko.json` under version control. It is the single source of truth for
> your project's identity, entry point, and the capabilities it is allowed to
> use.
