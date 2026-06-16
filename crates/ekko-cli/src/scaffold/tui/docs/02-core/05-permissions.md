# The Permission Model

EkkoJS is **deny by default**. A freshly run program cannot read your disk, open
a socket, or reach the network until *you* grant it the capability. This keeps
untrusted code from quietly doing things you did not ask for.

## Granting capabilities

Use the `--allow` flag to hand a program a capability:

```bash
ekko run server.ts --allow=net
ekko run report.ts --allow=fs
```

When code makes a native call it has not been granted, the runtime raises a
**PermissionError** instead of performing the action.

```ts
import { readText } from "ekko:fs";

// Without --allow=fs this line throws PermissionError
const data = await readText("./notes.txt");
console.log(data);
```

## Scoped grants

Grants can be narrowed so a program only touches what it needs:

```bash
ekko run sync.ts --allow=fs:./data
```

| Capability        | Grants access to                       |
| ----------------- | -------------------------------------- |
| `fs`              | The whole file system                  |
| `fs:./data`       | Only the `./data` subtree              |
| `net`             | All network access                     |
| `net:443`         | Only outbound port 443                 |

> Always prefer the *narrowest* grant that lets the job succeed. `fs:./data`
> tells anyone reading the command exactly what the program can touch.

## Declaring permissions in ekko.json

For project code, declare the capabilities once under `"permissions"`:

```json
{
  "name": "my-app",
  "permissions": {
    "fs": ["./data", "./cache"],
    "net": true
  }
}
```

With this in place, the project runs with its declared permissions and you do
not have to repeat `--allow` on every invocation.
