// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { tcp, udp, dns } from "ekko:net";
import { asserter, sleep } from "../_harness.ts";

const t = asserter();

function toBytes(d: unknown): Uint8Array {
  if (d instanceof Uint8Array) return d;
  if (Array.isArray(d)) return new Uint8Array(d as number[]);
  const s = String(d);
  const B = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const o: number[] = [];
  for (let i = 0; i < s.length;) {
    const a = B.indexOf(s[i++]), b = B.indexOf(s[i++]), c = B.indexOf(s[i++]), e = B.indexOf(s[i++]);
    o.push((a << 2) | (b >> 4));
    if (c !== -1) o.push(((b & 15) << 4) | (c >> 2));
    if (e !== -1) o.push(((c & 3) << 6) | e);
  }
  return new Uint8Array(o);
}
const decode = (d: unknown) => new TextDecoder().decode(toBytes(d));
const addrOf = (m: any) => m.address ?? m.ip;   

(async () => {
  
  t.group("dns.resolve");
  const local = await dns.resolve("localhost");
  t.ok("dns.resolve('localhost') is array", Array.isArray(local));
  t.ok("dns.resolve('localhost') includes a loopback addr", local.some((a: string) => a === "127.0.0.1" || a === "::1"));
  const ip = await dns.resolve("127.0.0.1");
  t.eq("dns.resolve('127.0.0.1') -> ['127.0.0.1']", JSON.stringify(ip), JSON.stringify(["127.0.0.1"]));
  await t.rejects("dns.resolve invalid host rejects", () => dns.resolve("nonexistent.invalid.tld.zzz.ekko"), /./);

  t.group("udp — createSocket / send / recv / close");
  const RX = 35811;
  const rx = udp.createSocket(RX);
  const tx = udp.createSocket(0);
  t.type("createSocket returns handle", rx, "number");
  t.gt("handle > 0", rx, 0);
  const recvP = udp.recv(rx);
  await sleep(50);
  udp.send(tx, "hello-ekko-udp", "127.0.0.1", RX);
  const msg: any = await Promise.race([recvP, sleep(3000).then(() => null)]);
  t.ok("udp.recv resolved (not timeout)", msg !== null);
  t.eq("udp payload round-trips", decode(msg?.data), "hello-ekko-udp");
  t.eq("udp sender address is loopback", addrOf(msg), "127.0.0.1");
  t.type("udp sender port is number", msg?.port, "number");
  t.notThrows("udp.close rx", () => udp.close(rx));
  t.notThrows("udp.close tx", () => udp.close(tx));

  t.group("udp — binary fidelity");
  const RX2 = 35812;
  const r2 = udp.createSocket(RX2);
  const t2 = udp.createSocket(0);
  const payload = new Uint8Array(256); for (let i = 0; i < 256; i++) payload[i] = i;
  const rp = udp.recv(r2);
  await sleep(50);
  udp.send(t2, payload, "127.0.0.1", RX2);
  const m2: any = await Promise.race([rp, sleep(3000).then(() => null)]);
  t.ok("binary udp recv resolved", m2 !== null);
  const got = toBytes(m2?.data);
  t.eq("binary udp length 256", got.length, 256);
  t.eq("binary udp byte[0]=0", got[0], 0);
  t.eq("binary udp byte[200]=200", got[200], 200);
  t.eq("binary udp byte[255]=255", got[255], 255);
  udp.close(r2); udp.close(t2);

  t.group("tcp — echo round-trip (server onConn + client)");
  const PORT = 35841;
  let gotConn = false;
  let connAddr = "";
  const srv = tcp.listen("127.0.0.1", PORT, (conn: any) => {
    gotConn = true; connAddr = conn.address;
    tcp.read(conn.handle, 1024).then((d: any) => { tcp.write(conn.handle, Uint8Array.from(toBytes(d))); });
  });
  t.type("tcp.listen returns a handle (number)", srv, "number");
  t.gt("listen handle > 0", srv, 0);
  await sleep(80);
  const c = await tcp.connect("127.0.0.1", PORT);
  t.type("tcp.connect returns handle", c, "number");
  tcp.write(c, "ping-echo-✓");
  const echoed = await Promise.race([tcp.read(c, 1024), sleep(2500).then(() => null)]);
  t.ok("server onConn fired", gotConn);
  t.eq("server saw client loopback address", connAddr, "127.0.0.1");
  t.ok("client received echo (not timeout)", echoed !== null);
  t.eq("tcp echo round-trips intact", decode(echoed), "ping-echo-✓");
  t.notThrows("tcp.close client", () => tcp.close(c));
  t.notThrows("tcp.stopServer", () => (tcp as any).stopServer(srv));

  t.group("tcp — connect error + method shapes");
  await t.rejects("tcp.connect to closed port rejects", () => tcp.connect("127.0.0.1", 1), /refus|error|connect|denied/i);
  for (const m of ["connect", "write", "read", "close", "listen", "stopServer"]) t.type("tcp." + m + " is function", (tcp as any)[m], "function");

  t.done("ekko:net (dns + udp + tcp echo)");
})().catch((e) => { console.log("UNCAUGHT: " + String((e as any)?.message ?? e)); Ekko.exit(1); });
