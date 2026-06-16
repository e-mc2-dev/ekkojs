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
import { asserter } from "../_harness.ts";

const t = asserter();

function mkws() {
  const sent: any[] = []; const cbs: any = {};
  return { sent, on(e: string, fn: any) { cbs[e] = fn; }, send(d: any) { sent.push(d); }, fire(e: string, ...a: any[]) { cbs[e] && cbs[e](...a); }, _cbs: cbs };
}

t.group("channels");
{
  const rt = createRealtime();
  t.eq("starts empty", rt.channelCount(), 0);
  rt.channel("lobby", {}); rt.channel("game", {});
  t.eq("channelCount", rt.channelCount(), 2);
  t.check("getChannel found", !!rt.getChannel("lobby"));
  t.eq("getChannel missing → null", rt.getChannel("nope"), null);
}

t.group("connection joins path channel");
{
  const rt = createRealtime();
  let joined: any = null;
  rt.channel("lobby", { join: (s: any) => { joined = s; } });
  const ws = mkws(); const s = rt.handleConnection(ws as any, "lobby");
  t.eq("socketCount 1", rt.socketCount(), 1);
  t.check("join handler fired with socket", joined === s);
  t.eq("lobby has 1 member", rt.getChannel("lobby").members.size, 1);
  t.check("getSocket by id", rt.getSocket(s.id) === s);
}

t.group("sock.send (string + object)");
{
  const rt = createRealtime(); rt.channel("c", {});
  const ws = mkws(); const s = rt.handleConnection(ws as any, "c");
  s.send("hello");
  t.eq("string sent as-is", ws.sent[0], "hello");
  s.send({ a: 1 });
  t.eq("object JSON-stringified", ws.sent[1], JSON.stringify({ a: 1 }));
}

t.group("join / leave room membership");
{
  const rt = createRealtime(); rt.channel("lobby", {}); rt.channel("room1", {});
  const ws = mkws(); const s = rt.handleConnection(ws as any, "lobby");
  s.join("room1");
  t.eq("room1 has member after join", rt.getChannel("room1").members.size, 1);
  s.leave("room1");
  t.eq("room1 empty after leave", rt.getChannel("room1").members.size, 0);
}

t.group("broadcast to rooms");
{
  const rt = createRealtime(); rt.channel("room", {});
  const wsA = mkws(); const a = rt.handleConnection(wsA as any, "room");
  const wsB = mkws(); const b = rt.handleConnection(wsB as any, "room");
  a.broadcast("ev", { n: 1 });
  t.eq("excludeSelf default → sender not notified", wsA.sent.length, 0);
  t.eq("other member notified", wsB.sent.length, 1);
  t.deep("payload shape", JSON.parse(wsB.sent[0]), { event: "ev", data: { n: 1 } });
  a.broadcast("ev2", { n: 2 }, false);
  t.eq("excludeSelf=false → sender also notified", wsA.sent.length, 1);
}

t.group("to(room).emit reaches all members");
{
  const rt = createRealtime(); rt.channel("room", {});
  const wsA = mkws(); const a = rt.handleConnection(wsA as any, "room");
  const wsB = mkws(); rt.handleConnection(wsB as any, "room");
  a.to("room").emit("ping", { t: 1 });
  t.eq("emitter included in to()", wsA.sent.length, 1);
  t.eq("other member included", wsB.sent.length, 1);
}

t.group("rt.broadcast to all sockets");
{
  const rt = createRealtime(); rt.channel("a", {}); rt.channel("b", {});
  const wsA = mkws(); rt.handleConnection(wsA as any, "a");
  const wsB = mkws(); rt.handleConnection(wsB as any, "b");
  rt.broadcast("global", { m: 1 });
  t.eq("all sockets receive (a)", wsA.sent.length, 1);
  t.eq("all sockets receive (b)", wsB.sent.length, 1);
}

t.group("message handler dispatch");
{
  const rt = createRealtime(); let got: any = null;
  rt.channel("chat", { message: (s: any, data: any) => { got = data; } });
  const ws = mkws(); rt.handleConnection(ws as any, "chat");
  ws.fire("message", "hi there");
  t.eq("message handler received data", got, "hi there");
}

t.done("ekko:web/realtime covered");
