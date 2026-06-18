# Networking

EkkoJS ships networking as two modules: **`ekko:net`** for raw TCP and UDP
sockets, and **`ekko:http`** for HTTP clients and servers. Both require the
`net` permission.

## An HTTP server

```ts
import { createServer } from "ekko:http";

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ path: req.url, ok: true }));
});

server.listen(8080);
console.log("Listening on http://localhost:8080");
```

Grant the capability when you run it:

```bash
ekko run server.ts --allow=net
```

> The `req.query` value is the *raw* query string, for example `?id=7&page=2`,
> not a parsed object. Parse it yourself when you need the individual values.

## Scoping network access

You can narrow the grant to a single port, which is handy for servers that
should only ever bind one place:

```bash
ekko run server.ts --allow=net:8080
```

## Raw sockets

For protocols below HTTP, reach for `ekko:net`:

```ts
import { connect } from "ekko:net";

const socket = await connect({ host: "127.0.0.1", port: 6379 });
socket.write("PING\r\n");
const reply = await socket.read();
console.log(reply);
```

## Choosing a module

1. Speaking HTTP to a service or building a web API? Use **`ekko:http`**.
2. Implementing a custom or binary protocol over TCP or UDP? Use **`ekko:net`**.
3. Building a full server rendered web app? Look at **`ekko:rune`**.

Pick the highest level module that fits. It will handle more of the protocol
details *for you*.
