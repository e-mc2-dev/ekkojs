<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ekkojs.com/assets/ekko-dark.webp" />
  <img src="https://ekkojs.com/assets/ekko-light.webp" alt="EkkoJS" width="150" />
</picture>

# EkkoJS

## The AI-guided JavaScript / TypeScript runtime

**Live LLM guidance. Pure ESM. Native performance. Batteries included.**

*Born from the Norwegian word for echo. Write once, resonate everywhere.*

[Website](https://ekkojs.com)  ·  [Documentation](https://ekkojs.com/docs)  ·  [Packages](https://bifrost.ekkojs.com)

</div>

---

## What is EkkoJS?

EkkoJS is a JavaScript / TypeScript runtime built for the AI coding era.

It is ESM-first, runs TypeScript directly, includes native backend APIs, and provides live LLM-readable runtime documentation through:

```sh
ekko doc --llm
```

The goal is simple:

> Any capable LLM should be able to code with EkkoJS without prior training, fine-tuning, or hallucinated APIs by following accurate runtime guidance from the installed version.

EkkoJS is not trying to be another thin wrapper around the existing JavaScript ecosystem. It is a runtime with its own backend-first API surface, designed to let developers and AI assistants build real applications with fewer dependencies and less setup.

---

## AI-first runtime guidance

Most LLMs were not trained on EkkoJS because the runtime is new.

That usually creates a problem: when an AI assistant does not know a framework or runtime, it guesses. It may invent APIs, mix patterns from other tools, or produce code that looks correct but does not run.

EkkoJS solves this with live runtime guidance.

```sh
ekko doc --llm
```

This command gives the LLM structured, accurate, runtime-aware documentation with rich examples, so it can quickly navigate EkkoJS APIs and generate code using the current installed version.

No fine-tuning.
No prior training.
No outdated assumptions.

The LLM can ask the runtime how to use EkkoJS, then write code based on real documentation.

---

## Install

```sh
# macOS / Linux
curl -fsSL https://ekkojs.com/install.sh | sh
```

```powershell
# Windows PowerShell
irm https://ekkojs.com/install.ps1 | iex
```

---

## A first server

Create `server.ts`:

```typescript
import { createServer, cors, helmet, rateLimit } from "ekko:web";

const server = createServer({ port: 3000, compression: true });

server.use(cors());
server.use(helmet());
server.use(rateLimit({ max: 100, window: 60_000 }));

server.get("/", (req, res) => {
  res.json({ message: "Hello from EkkoJS!" });
});

// :id is a path param, req.params is parsed for you.
server.get("/users/:id", (req, res) => {
  res.json({ userId: req.params.id });
});

server.start(); // http://0.0.0.0:3000
```

Run it:

```sh
ekko run server.ts
```

---

## Why EkkoJS?

Modern backend development often starts by assembling many packages before writing real business logic.

A simple API can quickly become a stack of dependencies for routing, security headers, CORS, rate limiting, testing, database access, jobs, environment handling, crypto, and more.

EkkoJS takes a different path:

> One runtime. Native APIs. Built-in backend tools. AI-readable documentation.

It is designed for developers who want to start fast, keep projects clean, and let AI assistants generate accurate code without guessing the runtime APIs.

---

## What's inside

EkkoJS is built from a Rust host, V8, and a .NET 10 AOT native layer.

One install, batteries included.

* **Direct TypeScript execution**: `.ts` and `.tsx` run without a build step.
* **Pure ESM**: modern JavaScript modules by design.
* **HTTP server**: a rock solid server with familiar route handlers.
* **Security middleware**: built-in CORS, Helmet, and rate limiting.
* **Threading**: real OS threads through a warm V8 isolate pool, spawned with `Ekko.spawn`.
* **Parallelism**: work runs across every core with structured concurrency.
* **Cancellation**: child tasks are owned by their parent and cancellation cascades down.
* **Channels**: typed, bounded channels with backpressure and `select`.
* **Testing**: a built-in test runner through `ekko test`.
* **I/O**: `ekko:fs`, `ekko:net`, `ekko:crypto`, and more.
* **ORM**: one ORM across SQLite, PostgreSQL, MySQL, SQL Server, and MongoDB.
* **LLM documentation**: runtime-aware documentation available through `ekko doc --llm`.

---

## Zero-shot runtime coding

EkkoJS introduces a simple idea:

> A runtime should be able to teach an AI assistant how to use it.

With `ekko doc --llm`, an LLM can access accurate documentation and examples directly from the runtime, then generate EkkoJS code without needing prior model training.

This makes EkkoJS especially useful for AI-assisted development tools, coding agents, and developers working with modern LLM workflows.

---

## Project status

EkkoJS is newly released and currently in early public preview.

It is ready for experimentation, demos, feedback, and early adopters.

The API may still evolve, and production use should be evaluated carefully.

If you test EkkoJS and something fails, feels unclear, or does not work as expected, feedback is welcome.

---

## Links

* Website: [ekkojs.com](https://ekkojs.com)
* Documentation: [ekkojs.com/docs](https://ekkojs.com/docs)
* Package registry: [bifrost.ekkojs.com](https://bifrost.ekkojs.com)

---

## License

MIT, Ampla Network LLC.

Author: [hello@e-mc2.dev](mailto:hello@e-mc2.dev)

EkkoJS is the result of the whole team's effort. Enjoy using it!
