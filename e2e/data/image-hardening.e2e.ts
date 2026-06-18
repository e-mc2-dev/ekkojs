// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import * as image from "ekko:image";
import { base64 } from "ekko:text/encoding";
import { asserter } from "../_harness";

const t = asserter();
const PNG = base64.decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
const ERR = /error|invalid|unsupported|format|decod|limit|memory|alloc|too large|insufficient|handle|dimension|unexpected|end of file|eof|truncat/i;

t.group("malformed / truncated input → clean error (no crash)");
t.throws("random garbage bytes", () => image.decode(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])), ERR);
t.throws("truncated PNG header", () => image.decode(PNG.slice(0, 20)), ERR);
t.throws("empty input", () => image.decode(new Uint8Array(0)), ERR);
t.throws("info() on garbage", () => image.info(new Uint8Array([9, 9, 9, 9, 9, 9])), ERR);
t.throws("wrong format hint", () => image.decode(PNG, "gif"), ERR);

t.group("decode-bomb → rejected by the allocation limit (not OOM)");

const farb = "farbfeld";
const magic = Array.from(farb).map((ch) => ch.charCodeAt(0));
const bomb = new Uint8Array([...magic, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
t.throws("4Gx4G farbfeld bomb rejected", () => { const i = image.decode(bomb, "farbfeld"); i.close(); }, ERR);

const bomb2 = new Uint8Array([...magic, 0x00, 0x00, 0xc3, 0x50, 0x00, 0x00, 0xc3, 0x50]);
t.throws("50kx50k farbfeld bomb rejected", () => { const i = image.decode(bomb2, "farbfeld"); i.close(); }, ERR);

t.group("unsupported encode targets → explicit error, not silent");
const im = image.decode(PNG).resize(8, 8);
t.throws("DDS encode unsupported", () => im.encode("dds"), /dds|unsupported/i);
t.throws("AVIF encode unsupported", () => im.encode("avif"), /avif|unsupported/i);
t.throws("unknown format name", () => im.encode("totally-not-a-format"), /unknown|format/i);

t.group("legal large image still decodes (no false-positive rejection)");
const big = im.resize(1500, 1500); 
t.eq("1500x1500 transform ok", big.width, 1500);
t.notThrows("re-encode + re-decode large png", () => { const d = image.decode(big.encode("png")); d.close(); });
big.close();
im.close();

t.done("ekko:image cybersec");
