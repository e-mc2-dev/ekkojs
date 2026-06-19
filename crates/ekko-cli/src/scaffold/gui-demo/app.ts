// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { createWindow, send, onMessage, setTitle, close, setAlwaysOnTop, createTray, setMenu } from "ekko:app/gui";

const mainWin = await createWindow({
  title: "EkkoJS GUI Demo",
  width: 900,
  height: 650,
  minWidth: 600,
  minHeight: 400,
  resizable: true,
  minimizable: true,
  maximizable: true,
  closable: true,
  decorations: true,
  alwaysOnTop: false,
  theme: "dark",
  root: "./ui",
});

console.log("Main window created, id:", mainWin);

setMenu([
  {
    label: "File",
    items: [
      { id: "new-window", label: "New Window" },
      { id: "frameless", label: "Frameless Window" },
      { type: "separator" },
      { id: "quit", label: "Quit" },
    ],
  },
  {
    label: "View",
    items: [
      { id: "always-on-top", label: "Toggle Always On Top" },
    ],
  },
]);

createTray({
  tooltip: "EkkoJS Demo",
  menu: [
    { id: "show", label: "Show Window" },
    { id: "about", label: "About EkkoJS" },
    { id: "quit", label: "Quit" },
  ],
});

let windowCount = 1;
let isOnTop = false;

onMessage((msg) => {
  console.log("Message:", JSON.stringify(msg));

  if (msg.type === "menu") {
    if (msg.id === "quit") {
      close();
    } else if (msg.id === "new-window") {
      windowCount++;
      createWindow({
        title: `Window #${windowCount}`,
        width: 500,
        height: 400,
        root: "./ui",
      });
    } else if (msg.id === "always-on-top") {
      isOnTop = !isOnTop;
      setAlwaysOnTop(mainWin, isOnTop);
      console.log("Always on top:", isOnTop);
    } else if (msg.id === "frameless") {
      windowCount++;
      createWindow({
        title: `Frameless #${windowCount}`,
        width: 500,
        height: 400,
        decorations: false,
        transparent: false,
        root: "./ui/frameless",
      });
    }
  }

  if (msg.type === "tray") {
    if (msg.event === "double-click") {
      send({ type: "notify", text: "Tray double-clicked!" });
    }
  }

  
  if (msg.data && msg.data.type === "window-control") {
    if (msg.data.action === "close") {
      close(msg.windowId);
    }
  }

  if (msg.data && msg.data.type === "ping") {
    send({ type: "pong", from: "V8", timestamp: Date.now() });
  }

  if (msg.data && msg.data.type === "set-title") {
    setTitle(msg.windowId, msg.data.title);
  }
});
