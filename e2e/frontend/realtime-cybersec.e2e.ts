// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createRealtime } from "ekko:web/realtime";
import { asserter } from "../_harness";

const t = asserter();

function mkws() {
  const sent: any[] = []; const cbs: any = {};
  return { sent, on(e: string, fn: any) { cbs[e] = fn; }, send(d: any) { sent.push(d); }, fire(e: string, ...a: any[]) { cbs[e] && cbs[e](...a); }, _cbs: cbs };
}

t.group("BUG A — disconnect frees membership in ALL joined rooms (no stale ids)");
{
  const rt = createRealtime(); rt.channel("lobby", {}); rt.channel("room1", {}); rt.channel("room2", {});
  const ws = mkws(); const s = rt.handleConnection(ws as any, "lobby");
  s.join("room1"); s.join("room2");
  t.eq("room1 has member before close", rt.getChannel("room1").members.size, 1);
  ws.fire("close");
  t.eq("lobby freed", rt.getChannel("lobby").members.size, 0);
  t.eq("room1 freed (was stale before fix)", rt.getChannel("room1").members.size, 0);
  t.eq("room2 freed", rt.getChannel("room2").members.size, 0);
  t.eq("socketCount 0", rt.socketCount(), 0);
}
{
  
  const rt = createRealtime(); rt.channel("p", {}); rt.channel("r", {});
  for (let i = 0; i < 50; i++) { const ws = mkws(); const s = rt.handleConnection(ws as any, "p"); s.join("r"); ws.fire("close"); }
  t.eq("room membership bounded after 50 cycles", rt.getChannel("r").members.size, 0);
  t.eq("socketCount bounded after 50 cycles", rt.socketCount(), 0);
}

t.group("BUG B — unregistered-path connection is freed on close (no socket leak)");
{
  const rt = createRealtime();
  const ws = mkws(); rt.handleConnection(ws as any, "no-such-channel");
  t.eq("socket counted", rt.socketCount(), 1);
  t.check("close handler IS registered (was missing before fix)", typeof ws._cbs.close === "function");
  ws.fire("close");
  t.eq("socket freed after close", rt.socketCount(), 0);
}
{
  
  const rt = createRealtime();
  for (let i = 0; i < 100; i++) { const ws = mkws(); rt.handleConnection(ws as any, "bogus-" + i); ws.fire("close"); }
  t.eq("socketCount 0 after 100 bogus connect/close", rt.socketCount(), 0);
}

t.group("stale-member set never crashes a broadcast and never delivers to dead sockets");
{
  const rt = createRealtime(); rt.channel("room", {});
  const wsDead = mkws(); const dead = rt.handleConnection(wsDead as any, "room");
  const wsLive = mkws(); const live = rt.handleConnection(wsLive as any, "room");
  wsDead.fire("close");                          
  t.notThrows("broadcast after a disconnect", () => live.broadcast("ev", { x: 1 }, false));
  t.eq("dead socket received nothing", wsDead.sent.length, 0);
  t.eq("live socket received", wsLive.sent.length, 1);
  t.notThrows("rt.broadcast after disconnect", () => rt.broadcast("g", { y: 1 }));
}

t.group("leave() then broadcast: a left member is not notified");
{
  const rt = createRealtime(); rt.channel("room", {});
  const wsA = mkws(); const a = rt.handleConnection(wsA as any, "room");
  const wsB = mkws(); const b = rt.handleConnection(wsB as any, "room");
  b.leave("room");
  a.broadcast("ev", { n: 1 });
  t.eq("left member B not notified", wsB.sent.length, 0);
}

t.done("ekko:web/realtime cybersec");
