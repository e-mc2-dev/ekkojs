# Running Code

Getting a program running in EkkoJS takes a single command. There is *no build
step*, no watcher to configure, and no output directory to clean.

## The run command

Point `ekko run` at any JavaScript or TypeScript entry file:

```bash
ekko run main.ts
```

TypeScript is transpiled in process by **SWC** before V8 sees it, so a `.ts`
file behaves exactly like a `.js` file. You can run either:

```bash
ekko run scripts/seed.ts
ekko run tools/report.js
```

## Passing arguments

Anything after the entry file is forwarded to your program:

```bash
ekko run greet.ts Ada Lovelace
```

```ts
// greet.ts
const [first, last] = Ekko.args;
console.log(`Welcome, ${first} ${last}!`);
```

## The REPL

Launch an interactive session to try ideas without a file:

```bash
ekko repl
```

Inside the REPL you can evaluate expressions, import `ekko:` modules, and inspect
results immediately. It is the fastest way to *probe* an API.

## A note on exit codes

| Outcome           | Exit code |
| ----------------- | --------- |
| Clean completion  | `0`       |
| Uncaught error    | `1`       |
| Interrupted (^C)  | `130`     |

> Scripts that exit non zero make great building blocks for shell pipelines and
> CI checks. Lean on the exit code rather than parsing log output.
