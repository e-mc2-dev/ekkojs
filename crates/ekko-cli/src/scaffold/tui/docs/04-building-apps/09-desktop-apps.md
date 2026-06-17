# Desktop Apps

The **`ekko:app/gui`** module opens native desktop windows that render a web UI.
You build the interface with familiar **HTML**, **CSS**, and **TypeScript**, and
EkkoJS hosts it in a real window with a bidirectional bridge to your backend
logic.

## Opening a window

```ts
import { createWindow } from "ekko:app/gui";

const win = await createWindow({
  title: "My App",
  width: 900,
  height: 600,
  url: "./ui/index.html",
});

await win.show();
```

Run a GUI app from its project folder with:

```bash
ekko run
```

## Bidirectional IPC

The native side and the web UI talk to each other over a typed channel. The
backend can *handle* requests from the page, and it can *push* events back.

```ts
// Backend: respond to a call from the web UI
win.handle("loadProfile", async (id: number) => {
  return { id, name: "Ada", role: "admin" };
});

// Backend: push an event to the web UI
win.emit("statusChanged", { online: true });
```

```ts
// Web UI side
const profile = await ekko.invoke("loadProfile", 42);
ekko.on("statusChanged", (s) => render(s));
```

## When to choose GUI

1. You want a *native window* rather than a terminal session.
2. Your interface is best expressed with HTML and CSS.
3. You need the system look and feel of a desktop application.

> Both halves run in one EkkoJS process, so the backend keeps the same
> permission model. A GUI that reads files still needs `--allow=fs`.

For interfaces that live *in* the terminal, reach for `ekko:app/tui` instead.
