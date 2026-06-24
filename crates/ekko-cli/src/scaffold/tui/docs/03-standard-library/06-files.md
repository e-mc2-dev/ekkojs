# Working with Files

File access in EkkoJS goes through the **`ekko:fs`** module. Reads and writes are
backed by the .NET native layer, so they are fast and typed, and they are gated
by the `fs` permission.

## Reading and writing text

```ts
import { readText, writeText } from "ekko:fs";

const note = await readText("./notes.txt");
console.log(note);

await writeText("./out.txt", note.toUpperCase());
```

Run it with the file capability:

```bash
ekko run files.ts --allow=fs:./
```

## Listing a directory

`readDir` returns an array of entries describing each item:

```ts
import { readDir } from "ekko:fs";

const entries = await readDir("./src");
for (const entry of entries) {
  const kind = entry.isDirectory ? "dir " : "file";
  console.log(`${kind} ${entry.name}`);
}
```

Each entry has the shape `{ name, isFile, isDirectory }`.

## The core API

| Function              | Returns                         |
| --------------------- | ------------------------------- |
| `readText(path)`      | File contents as a string       |
| `read(path)`          | File contents as bytes          |
| `writeText(path, s)`  | Writes a string to a file       |
| `readDir(path)`       | `{name,isFile,isDirectory}[]`   |
| `exists(path)`        | `true` if the path exists       |
| `mkdir(path)`         | Creates a directory             |

## Paths are relative to the working directory

> File system paths resolve against the *current working directory*, the place
> you launched `ekko` from, not the location of the source file.

This is a deliberate split. *Imports* are file relative so modules move
together, while *fs paths* are cwd relative so a tool behaves predictably no
matter where its code lives.
