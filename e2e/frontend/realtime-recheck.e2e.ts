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

t.group("join idempotency + leave-when-not-joined");
{
  const rt = createRealtime(); rt.channel("p", {}); rt.channel("r", {});
  const ws = mkws(); const s = rt.handleConnection(ws as any, "p");
  s.join("r"); s.join("r"); s.join("r");
  t.eq("double join → single membership", rt.getChannel("r").members.size, 1);
  t.notThrows("leave a room never joined", () => s.leave("never"));
  t.notThrows("leave twice", () => { s.leave("r"); s.leave("r"); });
  t.eq("membership 0 after leave", rt.getChannel("r").members.size, 0);
}

t.group("no-op edges");
{
  const rt = createRealtime(); rt.channel("p", {});
  const ws = mkws(); const s = rt.handleConnection(ws as any, "p");
  
  t.notThrows("broadcast with only path room", () => s.broadcast("e", {}));
  t.notThrows("to() nonexistent room is a no-op", () => s.to("ghost").emit("e", {}));
  const before = ws.sent.length;
  s.to("ghost").emit("e", {});
  t.eq("emit to ghost room sent nothing", ws.sent.length, before);
}

t.group("excludeSelf variants");
{
  const rt = createRealtime(); rt.channel("room", {});
  const wsA = mkws(); const a = rt.handleConnection(wsA as any, "room");
  const wsB = mkws(); rt.handleConnection(wsB as any, "room");
  a.broadcast("d", {});            
  t.eq("default excludes self", wsA.sent.length, 0);
  a.broadcast("d", {}, true);      
  t.eq("excludeSelf=true excludes self", wsA.sent.length, 0);
  a.broadcast("d", {}, false);     
  t.eq("excludeSelf=false includes self", wsA.sent.length, 1);
  t.eq("B got all three", wsB.sent.length, 3);
}

t.group("message handler: string + binary");
{
  const rt = createRealtime(); const seen: any[] = [];
  rt.channel("c", { message: (s: any, d: any) => seen.push(d) });
  const ws = mkws(); rt.handleConnection(ws as any, "c");
  ws.fire("message", "text");
  const bin = new Uint8Array([1, 2, 3]); ws.fire("message", bin);
  t.eq("string message delivered", seen[0], "text");
  t.check("binary message delivered as-is", seen[1] === bin);
}

t.group("count accuracy + partial disconnect");
{
  const rt = createRealtime(); rt.channel("room", {});
  const wsA = mkws(); rt.handleConnection(wsA as any, "room");
  const wsB = mkws(); const b = rt.handleConnection(wsB as any, "room");
  const wsC = mkws(); rt.handleConnection(wsC as any, "room");
  t.eq("3 sockets", rt.socketCount(), 3);
  t.eq("room has 3", rt.getChannel("room").members.size, 3);
  wsB.fire("close");
  t.eq("2 sockets after one disconnect", rt.socketCount(), 2);
  t.eq("room has 2 after disconnect", rt.getChannel("room").members.size, 2);
  t.eq("disconnected socket gone from registry", rt.getSocket(b.id), null);
  
  const wsA2 = wsA.sent.length;
  rt.broadcast("x", {});
  t.eq("A still notified", wsA.sent.length, wsA2 + 1);
}

t.done("ekko:web/realtime recheck");
