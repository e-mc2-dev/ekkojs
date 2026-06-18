# Modules and Imports

EkkoJS is **ESM only**. Every file is an ES module, and you share code with the
standard `import` and `export` keywords. There is no legacy module system to
fall back to.

## Importing your own code

Local imports are *extensionless*. Reference the module by name and let the
resolver find the file:

```ts
// util.ts
export function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-");
}
```

```ts
// main.ts
import { slugify } from "./util";

console.log(slugify("Hello World")); // hello-world
```

> Never write a file extension in an import. `./util` is correct, `./util.ts` is
> not. The resolver handles the extension for you in every run mode.

## Built in modules

Capabilities the runtime provides live behind the `ekko:` prefix:

```ts
import { readText } from "ekko:fs";
import { createServer } from "ekko:http";
```

The core `ekko:` modules:

| Module          | Purpose                                  |
| --------------- | ---------------------------------------- |
| `ekko:fs`       | Read and write files and directories     |
| `ekko:net`      | TCP and UDP sockets                       |
| `ekko:http`     | HTTP clients and servers                 |
| `ekko:app/tui`  | Terminal user interfaces                 |
| `ekko:app/gui`  | Native desktop windows with a web UI     |
| `ekko:app/cli`  | Command line tools and prompts           |
| `ekko:test`     | The built in test framework              |
| `ekko:rune`     | Server rendered web applications         |

## Re-exporting

Barrel files keep public surfaces tidy:

```ts
// index.ts
export { slugify } from "./util";
export { parseConfig } from "./config";
```

Use named exports where you can. They make imports *explicit* and easy to trace.
