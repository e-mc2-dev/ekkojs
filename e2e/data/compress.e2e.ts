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
import { asserter } from "../_harness.ts";

const t = asserter();
const A = (u: Uint8Array): number[] => Array.from(u);
const eqB = (a: Uint8Array, b: Uint8Array) => a.length === b.length && b.every((v, i) => a[i] === v);
const codecs = [["gzip", gzip], ["brotli", brotli], ["deflate", deflate]] as const;

t.group("works under default-deny");
t.notThrows("compress/decompress with no --allow", () => gzip.decompress(gzip.compress(utf8.encode("x"))));

const text = utf8.encode("EkkoJS compression test. ".repeat(40));
const all = new Uint8Array(256); for (let i = 0; i < 256; i++) all[i] = i;

for (const [name, c] of codecs) {
  t.group(name);
  t.check("text round-trip", eqB(c.decompress(c.compress(text)), text));
  t.check("0x00–0xFF fidelity", eqB(c.decompress(c.compress(all)), all));
  t.check("empty round-trip", c.decompress(c.compress(new Uint8Array(0))).length === 0);
  t.check("single byte", eqB(c.decompress(c.compress(new Uint8Array([42]))), new Uint8Array([42])));
  t.lt("compresses repetitive data", c.compress(text).length, text.length);
  t.check("level fastest round-trip", eqB(c.decompress(c.compress(text, { level: "fastest" })), text));
  t.check("level optimal round-trip", eqB(c.decompress(c.compress(text, { level: "optimal" })), text));
  t.check("level smallest round-trip", eqB(c.decompress(c.compress(text, { level: "smallest" })), text));
  
  const big = new Uint8Array(1024 * 1024); for (let i = 0; i < big.length; i++) big[i] = (i * 7) & 0xff;
  t.check("1MB round-trip", eqB(c.decompress(c.compress(big)), big));
  
  const cs = c.createCompressStream(); cs.write(text.slice(0, 100)); cs.write(text.slice(100)); const comp = cs.finish();
  const ds = c.createDecompressStream(); ds.write(comp); const back = ds.finish();
  t.check("streaming chunked round-trip", eqB(back, text));
  t.check("streaming single-chunk", (() => { const s = c.createCompressStream(); s.write(text); const cc = s.finish(); const d = c.createDecompressStream(); d.write(cc); return eqB(d.finish(), text); })());
}

t.group("cross-codec");
t.check("gzip != deflate output", !eqB(gzip.compress(text), deflate.compress(text)));
t.check("gzip != brotli output", !eqB(gzip.compress(text), brotli.compress(text)));
t.throws("decompress gzip data with deflate", () => deflate.decompress(gzip.compress(text)), /.+/);
t.throws("decompress brotli data with gzip", () => gzip.decompress(brotli.compress(text)), /.+/);

t.done("ekko:compress covered");
