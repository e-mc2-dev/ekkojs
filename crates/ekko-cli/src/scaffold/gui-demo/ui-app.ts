// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { ekko } from "./_core";

const output = document.getElementById("output") as HTMLPreElement;
const btnPing = document.getElementById("btn-ping") as HTMLButtonElement;
const btnTitle = document.getElementById("btn-title") as HTMLButtonElement;

(document.getElementById("info-protocol") as HTMLElement).textContent = location.protocol;
(document.getElementById("info-origin") as HTMLElement).textContent = location.origin;
(document.getElementById("info-url") as HTMLElement).textContent = location.href;
(document.getElementById("info-ua") as HTMLElement).textContent = navigator.userAgent.slice(0, 80);

let msgCount = 0;

btnPing.addEventListener("click", () => {
  ekko.send({ type: "ping", timestamp: Date.now() });
  log("Sent ping to V8");
});

btnTitle.addEventListener("click", () => {
  const title = `EkkoJS Demo — ${new Date().toLocaleTimeString()}`;
  ekko.send({ type: "set-title", title });
  log(`Requested title: ${title}`);
});

ekko.onMessage((msg) => {
  log(`From V8: ${JSON.stringify(msg)}`);
  if (msg.type === "notify") {
    log(`Notification: ${msg.text}`);
  }
});

function log(text: string) {
  msgCount++;
  const line = `[${msgCount}] ${text}`;
  output.textContent = line + "\n" + (output.textContent || "");
}
