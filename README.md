<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ekkojs.com/assets/ekko-dark.webp" />
  <img src="https://ekkojs.com/assets/ekko-light.webp" alt="EkkoJS" width="150" />
</picture>

# The Modern JavaScript Runtime

**Pure ESM. Native performance. Batteries included.**

*Born from the Norwegian word for echo. Write once, resonate everywhere.*

[Website](https://ekkojs.com) &nbsp;·&nbsp; [Documentation](https://ekkojs.com/docs) &nbsp;·&nbsp; [Packages](https://bifrost.ekkojs.com)

</div>

---

## Install

```sh
# macOS / Linux
curl -fsSL https://ekkojs.com/install.sh | sh
```
```powershell
# Windows (PowerShell)
irm https://ekkojs.com/install.ps1 | iex
```

## A first server

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

## What's inside

One runtime, built from a Rust host, V8, and a .NET 10 AOT native layer. One install, batteries included.

- **HTTP server**: a Kestrel-backed server with familiar route handlers and built-in security middleware (CORS, Helmet, rate limiting).
- **Threading**: real OS threads through a warm V8 isolate pool, spawned with `Ekko.spawn`.
- **Parallelism**: work runs across every core, with structured concurrency so children are owned by their parent and cancellation cascades down.
- **Channels**: typed, bounded channels with backpressure and `select`, for safe message passing between contexts.
- **Testing**: a built-in test runner, `ekko test`, no extra tooling.
- **I/O**: `ekko:fs`, `ekko:net`, `ekko:crypto` and more, backed by .NET's production libraries.
- **ORM**: one ORM across SQLite, PostgreSQL, MySQL, SQL Server and MongoDB.

TypeScript runs directly: `.ts` and `.tsx` need no build step.

## Zero-shot runtime coding

No fine-tuning, no prior training. Any capable AI can follow live runtime guidance from `ekko doc --llm`
and write correct EkkoJS code on the first try.

## Links

- Website, [ekkojs.com](https://ekkojs.com)
- Documentation, [ekkojs.com/docs](https://ekkojs.com/docs)
- Package registry, [bifrost.ekkojs.com](https://bifrost.ekkojs.com)

## License

MIT, Ampla Network LLC. Author: hello@e-mc2.dev

EkkoJS is the result of the whole team's effort, enjoy using it!
