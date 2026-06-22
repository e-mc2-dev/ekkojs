// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { send, onMessage } from "./_core";

let myId: number | null = null;
let myLabel = "connecting...";

const nonce = Math.random().toString(36).slice(2);

const $ = (id: string) => document.getElementById(id)!;
const identity = $("identity");
const log = $("log");
const msgInput = $("msg") as HTMLInputElement;
const dmTarget = $("dm-target") as HTMLInputElement;

$("info-protocol").textContent = location.protocol;
$("info-origin").textContent = location.origin;
$("info-url").textContent = location.href;

$("btn-new").addEventListener("click", () => send({ type: "new-window-request" }));
$("btn-frameless").addEventListener("click", () => send({ type: "new-frameless-request" }));
$("btn-ontop").addEventListener("click", () => send({ type: "toggle-on-top-request" }));
$("btn-title").addEventListener("click", () => {
  const title = (myLabel || "Window") + " - " + new Date().toLocaleTimeString();
  send({ type: "set-title", title });
});

$("btn-broadcast").addEventListener("click", () => {
  const text = msgInput.value.trim();
  if (!text) return;
  send({ type: "broadcast", text });
  msgInput.value = "";
});

$("btn-dm").addEventListener("click", () => {
  const text = msgInput.value.trim();
  const to = parseInt(dmTarget.value, 10);
  if (!text || !to) return;
  send({ type: "dm", to, text });
  msgInput.value = "";
});

msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btn-broadcast").dispatchEvent(new MouseEvent("click"));
});

onMessage((m: any) => {
  if (m.channel === "whoami" && m.nonce === nonce) {
    
    myId = m.windowId;
    myLabel = m.label;
    identity.textContent = myLabel + "  (id " + myId + ")";
    identity.classList.add("ok");
    return;
  }

  if (m.channel === "chat") {
    
    if (m.scope === "dm" && m.to !== myId) return;
    addLine(m.scope, m.from, m.text);
  }
});

function addLine(scope: string, from: string, text: string) {
  const line = document.createElement("div");
  line.className = "log-line";

  const chip = document.createElement("span");
  chip.className = "chip " + (scope === "dm" ? "chip-dm" : "chip-all");
  chip.textContent = scope === "dm" ? "direct" : "all";

  const who = document.createElement("span");
  who.className = "log-from";
  who.textContent = from;

  const body = document.createElement("span");
  body.textContent = text;

  line.append(chip, who, body);
  log.prepend(line);
}

send({ type: "register", nonce });
