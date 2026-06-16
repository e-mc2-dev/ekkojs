# Welcome to EkkoJS

**EkkoJS** is a JavaScript and TypeScript runtime built for people who want
*speed*, *safety*, and *zero ceremony*. You write a `.ts` file, you run it. There
is no build step to babysit and no install folder to dig through.

## What powers it

EkkoJS is three layers working as one:

- A **Rust** host that owns the process, the event loop, and the security model.
- The **V8** engine, the same high performance JavaScript engine used in
  production browsers, executing your code.
- A **.NET 10** native layer compiled ahead of time (AOT) that provides fast,
  typed system APIs behind the `ekko:` modules.

> EkkoJS is ESM only with zero compatibility shims for older module systems.
> If you have written modern JavaScript, you already know how to use it.

## A first taste

```ts
// hello.ts runs directly, no build step
const name = "EkkoJS";
console.log(`Hello from ${name}!`);
```

Run it with:

```bash
ekko run hello.ts
```

## Why it feels different

1. **TypeScript is a first class citizen.** Types are transpiled in process, so
   `.ts` is just as runnable as `.js`.
2. **Secure by default.** Code cannot touch the network or disk until you grant
   permission.
3. **Batteries built in.** File system, networking, terminal UIs, desktop
   windows, and testing all ship as `ekko:` modules.

Read on to learn how to *run code*, work with *modules*, and build real apps.
