// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { tcp, udp } from "ekko:net";
import { asserter, sleep } from "../_harness";

const t = asserter();

function toBytes(d: unknown): Uint8Array {
  if (d instanceof Uint8Array) return d;
  if (Array.isArray(d)) return new Uint8Array(d as number[]);
  return new Uint8Array(0);
}

async function readN(h: number, n: number): Promise<Uint8Array> {
  const acc: number[] = [];
  while (acc.length < n) {
    const d = toBytes(await tcp.read(h, 65536));
    if (d.length === 0) break;
    for (let i = 0; i < d.length; i++) acc.push(d[i]);
  }
  return new Uint8Array(acc);
}

(async () => {
  
  const PORT = 35861;
  function pump(h: number) {
    tcp.read(h, 65536).then((d: any) => {
      const b = toBytes(d);
      if (b.length > 0) { tcp.write(h, Uint8Array.from(b)); pump(h); }
    }).catch(() => {});
  }
  const srv = tcp.listen("127.0.0.1", PORT, (conn: any) => pump(conn.handle));
  await sleep(80);

  t.group("tcp — large transfer (~64 KB) integrity");
  const SIZE = 64 * 1024;
  const big = new Uint8Array(SIZE);
  for (let i = 0; i < SIZE; i++) big[i] = i & 0xff;
  const c1 = await tcp.connect("127.0.0.1", PORT);
  tcp.write(c1, big);
  const back = await Promise.race([readN(c1, SIZE), sleep(8000).then(() => new Uint8Array(0))]);
  t.eq("64KB echoed length", back.length, SIZE);
  t.eq("64KB byte[0]", back[0], 0);
  t.eq("64KB byte[12345]", back[12345], 12345 & 0xff);
  t.eq("64KB last byte", back[SIZE - 1], (SIZE - 1) & 0xff);
  tcp.close(c1);

  t.group("tcp — 5 concurrent connections");
  const results = await Promise.all(Array.from({ length: 5 }, async (_, i) => {
    const h = await tcp.connect("127.0.0.1", PORT);
    const msg = "conn-" + i + "-payload";
    tcp.write(h, msg);
    const r = await Promise.race([readN(h, msg.length), sleep(4000).then(() => new Uint8Array(0))]);
    tcp.close(h);
    return new TextDecoder().decode(r) === msg;
  }));
  t.ok("all 5 concurrent echoes correct", results.every(Boolean));

  t.group("tcp — binary fidelity");
  const payload = new Uint8Array(256); for (let i = 0; i < 256; i++) payload[i] = i;
  const c2 = await tcp.connect("127.0.0.1", PORT);
  tcp.write(c2, payload);
  const echoed = await Promise.race([readN(c2, 256), sleep(4000).then(() => new Uint8Array(0))]);
  t.eq("binary echo length 256", echoed.length, 256);
  t.ok("binary echo identical", echoed.every((b, i) => b === i));
  tcp.close(c2);

  t.group("tcp — error edges");
  await t.rejects("connect refused on closed port", () => tcp.connect("127.0.0.1", 2), /refus|error|connect/i);
  const c3 = await tcp.connect("127.0.0.1", PORT);
  tcp.close(c3);
  await t.rejects("read after close rejects", () => tcp.read(c3, 16), /./);

  (tcp as any).stopServer(srv);
  t.done("ekko:net recheck");
})().catch((e) => { console.log("UNCAUGHT: " + String((e as any)?.message ?? e)); Ekko.exit(1); });
