// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { gzip, brotli, deflate } from "ekko:compress";
import { utf8 } from "ekko:text/encoding";
import { asserter } from "../_harness";

const t = asserter();
const eqB = (a: Uint8Array, b: Uint8Array) => a.length === b.length && b.every((v, i) => a[i] === v);
const codecs = [["gzip", gzip], ["brotli", brotli], ["deflate", deflate]] as const;

t.group("unicode round-trip (utf8 bytes)");
for (const [name, c] of codecs) {
  const u = utf8.encode("café 日本語 😀🎉 Ω≈ç ".repeat(20));
  t.eq(name + " unicode round-trip", utf8.decode(c.decompress(c.compress(u))), utf8.decode(u));
}

t.group("determinism + level size ordering");
const text = utf8.encode("repeat me ".repeat(200));
for (const [name, c] of codecs) {
  t.check(name + " compress deterministic", eqB(c.compress(text), c.compress(text)));
  t.check(name + " smallest ≤ fastest size", c.compress(text, { level: "smallest" }).length <= c.compress(text, { level: "fastest" }).length);
}

t.group("chunk-boundary independence (streaming == one-shot result)");
for (const [name, c] of codecs) {
  
  const oneShot = c.decompress(c.compress(text));
  const cs = c.createCompressStream();
  for (let i = 0; i < text.length; i += 7) cs.write(text.slice(i, i + 7));
  const streamed = c.decompress(cs.finish());
  t.check(name + " chunked compress → same decompressed", eqB(streamed, oneShot) && eqB(oneShot, text));
}

t.group("streaming decompress in chunks");
for (const [name, c] of codecs) {
  const comp = c.compress(text);
  const ds = c.createDecompressStream();
  for (let i = 0; i < comp.length; i += 5) ds.write(comp.slice(i, i + 5));
  t.check(name + " chunked decompress round-trip", eqB(ds.finish(), text));
}

t.group("incompressible data still round-trips");
{
  
  const rnd = new Uint8Array(4096); let s = 12345; for (let i = 0; i < rnd.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; rnd[i] = s & 0xff; }
  for (const [name, c] of codecs) t.check(name + " incompressible round-trip", eqB(c.decompress(c.compress(rnd)), rnd));
}

t.group("edge sizes + footgun");
t.eq("empty compress→decompress length 0", gzip.decompress(gzip.compress(new Uint8Array(0))).length, 0);
t.check("odd size 1023", eqB(gzip.decompress(gzip.compress(new Uint8Array(1023).fill(7))), new Uint8Array(1023).fill(7)));

t.eq("compress('hi') uses utf8 bytes → decompress matches", utf8.decode(gzip.decompress(gzip.compress("hi" as unknown as Uint8Array))), "hi");

t.done("ekko:compress recheck");
