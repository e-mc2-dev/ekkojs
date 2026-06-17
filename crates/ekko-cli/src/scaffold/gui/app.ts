// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import {
  createWindow, send, onMessage,
  setTitle, close, setAlwaysOnTop,
  createTray, setMenu,
} from "ekko:app/gui";

const mainWindow = await createWindow({
  title: "EkkoJS GUI Demo",
  width: 920,
  height: 640,
  minWidth: 640,
  minHeight: 420,
  resizable: true,
  decorations: true,   
  theme: "dark",
  root: "./ui",          
});

setMenu([
  {
    label: "File",
    items: [
      { id: "new-window", label: "New Window" },
      { id: "new-frameless", label: "New Frameless Window" },
      { type: "separator" },
      { id: "quit", label: "Quit" },
    ],
  },
  {
    label: "View",
    items: [
      { id: "toggle-on-top", label: "Toggle Always On Top" },
    ],
  },
]);

createTray({
  tooltip: "EkkoJS GUI Demo",
  menu: [
    { id: "new-window", label: "New Window" },
    { id: "broadcast-hello", label: "Broadcast hello to all windows" },
    { id: "quit", label: "Quit" },
  ],
});

const labels = new Map<number, string>();
let windowCount = 0;
let alwaysOnTop = false;

function registerWindow(id: number): string {
  if (!labels.has(id)) {
    windowCount++;
    labels.set(id, "Window #" + windowCount);
  }
  return labels.get(id)!;
}
registerWindow(mainWindow);

function openWindow(frameless: boolean) {
  windowCount++;
  createWindow({
    title: frameless ? "Frameless #" + windowCount : "Window #" + windowCount,
    width: 560,
    height: 460,
    theme: "dark",
    decorations: !frameless,                         
    root: frameless ? "./ui/frameless" : "./ui",     
  });
}

onMessage((msg: any) => {

  if (msg.type === "menu") {
    if (msg.id === "new-window") openWindow(false);
    else if (msg.id === "new-frameless") openWindow(true);
    else if (msg.id === "quit") close();
    else if (msg.id === "toggle-on-top") {
      alwaysOnTop = !alwaysOnTop;
      setAlwaysOnTop(mainWindow, alwaysOnTop);
    } else if (msg.id === "broadcast-hello") {
      
      send({ channel: "chat", scope: "all", from: "Tray", text: "Hello, everyone!" });
    }
    return;
  }

  if (msg.type === "tray") {
    if (msg.event === "double-click") send({ channel: "chat", scope: "all", from: "Tray", text: "Tray double-clicked" });
    return;
  }

  
  const data = msg.data;
  const fromId = msg.windowId;
  if (!data) return;

  switch (data.type) {
    
    case "new-window-request": openWindow(false); break;
    case "new-frameless-request": openWindow(true); break;
    case "toggle-on-top-request":
      alwaysOnTop = !alwaysOnTop;
      setAlwaysOnTop(mainWindow, alwaysOnTop);
      break;

    
    
    case "register": {
      const label = registerWindow(fromId);
      send({ channel: "whoami", nonce: data.nonce, windowId: fromId, label });
      break;
    }

    case "broadcast":
      send({ channel: "chat", scope: "all", from: labels.get(fromId) || "?", text: data.text });
      break;

    case "dm":
      send({ channel: "chat", scope: "dm", to: data.to, from: labels.get(fromId) || "?", text: data.text });
      break;

    case "window-control":
      if (data.action === "close") close(fromId);
      break;

    case "set-title":
      setTitle(fromId, data.title);
      break;
  }
});

console.log("GUI demo running. Main window id:", mainWindow);
