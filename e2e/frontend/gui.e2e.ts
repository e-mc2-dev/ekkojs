// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import * as gui from "ekko:app/gui";
import { asserter } from "../_harness.ts";

const t = asserter();
const g = gui as any;

t.group("covered — export surface present + well-typed");
for (const name of ["createWindow", "send", "onMessage", "setTitle", "close", "setAlwaysOnTop", "createTray", "setMenu"]) {
  t.eq(name + " is a function", typeof g[name], "function");
}
t.check("no unexpected missing exports", Object.keys(gui).length >= 8);

t.group("covered — onMessage is the only pure-JS surface (registers a callback)");

t.eq("onMessage arity (1 param)", g.onMessage.length, 1);

t.done("ekko:app/gui surface (window ops require ekko gui host)");
