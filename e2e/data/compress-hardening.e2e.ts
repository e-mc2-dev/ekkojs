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
const codecs = [["gzip", gzip], ["brotli", brotli], ["deflate", deflate]] as const;

t.group("corrupt / garbage / wrong-codec decompress throws cleanly");
for (const [name, c] of codecs) {
  t.throws(name + " garbage bytes", () => c.decompress(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])), /.+/);
  t.throws(name + " random header", () => c.decompress(new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x11])), /.+/);
}
t.throws("gzip decompress of deflate data", () => gzip.decompress(deflate.compress(utf8.encode("hi there"))), /.+/);

t.group("liveness — valid op works after a throw");
try { gzip.decompress(new Uint8Array([9, 9, 9])); } catch {  }
{
  const x = utf8.encode("after throw");
  t.check("compress/decompress still works", (() => { const r = gzip.decompress(gzip.compress(x)); return r.length === x.length; })());
}

t.group("decompression bomb capped at 256MB (was unbounded — DoS)");

function bomb(c: any): Uint8Array {
  const chunk = new Uint8Array(1024 * 1024); 
  const cs = c.createCompressStream();
  for (let i = 0; i < 300; i++) cs.write(chunk); 
  return cs.finish(); 
}
for (const [name, c] of codecs) {
  const b = bomb(c);
  t.lt(name + " bomb payload is tiny", b.length, 5_000_000);
  t.throws(name + " decompress bomb throws (capped, not OOM)", () => c.decompress(b), /bomb|exceed|limit|large|error|I\/O/i);
}

t.group("under-cap large decompress still works");
{
  const data = new Uint8Array(10 * 1024 * 1024); for (let i = 0; i < data.length; i += 4096) data[i] = i & 0xff;
  t.check("10MB round-trip under cap", gzip.decompress(gzip.compress(data)).length === data.length);
}

t.group("streaming lifecycle safe (no crash)");
t.throws("double finish throws", () => { const s = gzip.createCompressStream(); s.write(utf8.encode("x")); s.finish(); s.finish(); }, /.+/);
t.throws("write after finish throws", () => { const s = gzip.createCompressStream(); s.write(utf8.encode("x")); s.finish(); s.write(utf8.encode("y")); }, /.+/);
t.notThrows("empty compress stream finish", () => { const s = gzip.createCompressStream(); s.finish(); });

t.done("ekko:compress hardening");
