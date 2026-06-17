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
const c: [string, boolean][] = [];

const text = "Hello, EkkoJS compression! ".repeat(100);
const data = new Uint8Array(text.length);
for (let i = 0; i < text.length; i++) data[i] = text.charCodeAt(i);

const gz = gzip.compress(data);
c.push(["gzip compress returns Uint8Array", gz instanceof Uint8Array && gz.length > 0]);
c.push(["gzip compressed smaller", gz.length < data.length]);
const gzd = gzip.decompress(gz);
c.push(["gzip decompress roundtrip", gzd.length === data.length && gzd[0] === data[0] && gzd[gzd.length - 1] === data[data.length - 1]]);

const br = brotli.compress(data);
c.push(["brotli compress", br instanceof Uint8Array && br.length > 0]);
c.push(["brotli compressed smaller", br.length < data.length]);
const brd = brotli.decompress(br);
c.push(["brotli decompress roundtrip", brd.length === data.length && brd[0] === data[0]]);

const df = deflate.compress(data);
c.push(["deflate compress", df instanceof Uint8Array && df.length > 0]);
c.push(["deflate compressed smaller", df.length < data.length]);
const dfd = deflate.decompress(df);
c.push(["deflate decompress roundtrip", dfd.length === data.length && dfd[0] === data[0]]);

const fast = gzip.compress(data, { level: "fastest" });
const small = gzip.compress(data, { level: "smallest" });
c.push(["level fastest works", fast instanceof Uint8Array && fast.length > 0]);
c.push(["level smallest works", small instanceof Uint8Array && small.length > 0]);
c.push(["smallest <= optimal", small.length <= gz.length]);

const stream = gzip.createCompressStream();
const half = Math.floor(data.length / 2);
stream.write(data.slice(0, half));
stream.write(data.slice(half));
const streamed = stream.finish();
c.push(["streaming compress works", streamed instanceof Uint8Array && streamed.length > 0]);
const streamDecompressed = gzip.decompress(streamed);
c.push(["streaming compress roundtrip", streamDecompressed.length === data.length && streamDecompressed[0] === data[0]]);

const decompressor = gzip.createDecompressStream();
decompressor.write(gz);
const decompResult = decompressor.finish();
c.push(["streaming decompress", decompResult.length === data.length && decompResult[0] === data[0]]);

const big = new Uint8Array(1024 * 1024);
for (let i = 0; i < big.length; i++) big[i] = i % 256;
const bigGz = gzip.compress(big);
const bigBack = gzip.decompress(bigGz);
c.push(["1MB compress/decompress", bigBack.length === big.length && bigBack[0] === big[0] && bigBack[1000] === big[1000]]);

let p = 0, f = 0;
for (const [n, ok] of c) {
  if (ok) { p++; console.log("  PASS:", n); }
  else { f++; console.log("  FAIL:", n); }
}
console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
