// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { base64, hex, utf8, utf16 } from "ekko:text/encoding";
import { asserter } from "../_harness.ts";

const t = asserter();
const A = (u: Uint8Array): number[] => Array.from(u);
const U = (...b: number[]) => new Uint8Array(b);
const bytesEq = (u: Uint8Array, b: number[]) => u.length === b.length && b.every((v, i) => u[i] === v);

t.group("works under default-deny (pure data, no permission gate)");
t.notThrows("base64 round-trip with no --allow", () => utf8.decode(base64.decode(base64.encode(utf8.encode("x")))));

t.group("base64 — RFC 4648 vectors");
const B64: [string, string][] = [["", ""], ["f", "Zg=="], ["fo", "Zm8="], ["foo", "Zm9v"], ["foob", "Zm9vYg=="], ["fooba", "Zm9vYmE="], ["foobar", "Zm9vYmFy"]];
for (const [s, e] of B64) {
  t.eq("encode(" + JSON.stringify(s) + ")", base64.encode(utf8.encode(s)), e);
  t.eq("decode(" + JSON.stringify(e) + ")", utf8.decode(base64.decode(e)), s);
}
t.eq("encode empty → ''", base64.encode(U()), "");
t.eq("decode '' → []", base64.decode("").length, 0);
t.check("decode∘encode identity", bytesEq(base64.decode(base64.encode(U(1, 2, 3, 250, 255))), [1, 2, 3, 250, 255]));

t.group("base64url — URL-safe, no padding");
t.eq("encodeUrl [0xfb,0xff,0xbf] → -_-_", base64.encodeUrl(U(0xfb, 0xff, 0xbf)), "-_-_");
const urlSafe = base64.encodeUrl(U(0xfb, 0xff, 0xbf, 0x10, 0x20));
t.check("encodeUrl charset [A-Za-z0-9_-] only", /^[A-Za-z0-9_-]*$/.test(urlSafe));
t.check("encodeUrl has no '+' '/' '='", !/[+/=]/.test(base64.encodeUrl(U(0xfb, 0xff, 0xbf))));
for (let n = 0; n <= 4; n++) {
  const bytes = U(...Array.from({ length: n }, (_, i) => (i * 37 + 200) & 0xff));
  t.check("decodeUrl∘encodeUrl len=" + n, bytesEq(base64.decodeUrl(base64.encodeUrl(bytes)), A(bytes)));
}
t.eq("decodeUrl('subjects?_d' rt)", utf8.decode(base64.decodeUrl(base64.encodeUrl(utf8.encode("subjects?_d")))), "subjects?_d");

t.group("hex — lowercase encode / round-trip");
t.eq("encode([de,ad,be,ef]) → deadbeef", hex.encode(U(0xde, 0xad, 0xbe, 0xef)), "deadbeef");
t.check("decode('deadbeef')", bytesEq(hex.decode("deadbeef"), [0xde, 0xad, 0xbe, 0xef]));
t.check("decode upper == lower", bytesEq(hex.decode("DEADBEEF"), A(hex.decode("deadbeef"))));
t.eq("encode empty → ''", hex.encode(U()), "");
t.eq("decode '' → []", hex.decode("").length, 0);
t.eq("encode length == 2×bytes", hex.encode(U(0, 1, 2, 3, 4)).length, 10);
t.eq("encode is lowercase", hex.encode(U(0xab, 0xcd, 0xef)), "abcdef");

t.group("utf8 — round-trip + unicode");
for (const s of ["", "EkkoJS", "ASCII 123!@#", "café — naïve", "日本語テスト", "😀🎉👨‍👩‍👧", "á", "Ω≈ç√∫"]) {
  t.eq("utf8 round-trip " + JSON.stringify(s).slice(0, 14), utf8.decode(utf8.encode(s)), s);
}
t.check("utf8.encode('A') == [0x41]", bytesEq(utf8.encode("A"), [0x41]));
t.check("utf8.encode('é') == [0xc3,0xa9]", bytesEq(utf8.encode("é"), [0xc3, 0xa9]));
t.eq("utf8.encode('😀') is 4 bytes", utf8.encode("😀").length, 4);
t.eq("utf8.decode([0x41,0x42]) == 'AB'", utf8.decode(U(0x41, 0x42)), "AB");

t.group("utf16 — LE / BE byte order + round-trip");
t.check("LE encode('Hi') == [72,0,105,0]", bytesEq(utf16.encode("Hi"), [72, 0, 105, 0]));
t.check("BE encode('Hi') == [0,72,0,105]", bytesEq(utf16.encodeBE("Hi"), [0, 72, 0, 105]));
t.ne("LE != BE bytes", JSON.stringify(A(utf16.encode("Hi"))), JSON.stringify(A(utf16.encodeBE("Hi"))));
for (const s of ["", "Hi", "héllo", "日本😀", "Ω≈ç"]) {
  t.eq("utf16 LE round-trip " + JSON.stringify(s).slice(0, 10), utf16.decode(utf16.encode(s)), s);
  t.eq("utf16 BE round-trip " + JSON.stringify(s).slice(0, 10), utf16.decodeBE(utf16.encodeBE(s)), s);
}
t.eq("utf16 LE byte length == 2×units", utf16.encode("Hi").length, 4);
t.eq("utf16 LE emoji length == 4 (2 units)", utf16.encode("😀").length, 4);

t.group("composition");
t.eq("base64(utf8('Hello, world!')) rt", utf8.decode(base64.decode(base64.encode(utf8.encode("Hello, world!")))), "Hello, world!");
t.eq("hex(utf8(...)) rt", utf8.decode(hex.decode(hex.encode(utf8.encode("EkkoJS 日本")))), "EkkoJS 日本");
t.eq("base64url(utf8(...)) rt", utf8.decode(base64.decodeUrl(base64.encodeUrl(utf8.encode("a/b+c?d")))), "a/b+c?d");

t.group("binary fidelity — all 256 byte values");
const all = new Uint8Array(256);
for (let i = 0; i < 256; i++) all[i] = i;
t.check("base64 0x00–0xFF round-trip", bytesEq(base64.decode(base64.encode(all)), A(all)));
t.check("base64url 0x00–0xFF round-trip", bytesEq(base64.decodeUrl(base64.encodeUrl(all)), A(all)));
t.check("hex 0x00–0xFF round-trip", bytesEq(hex.decode(hex.encode(all)), A(all)));
t.eq("hex of 256 bytes is 512 chars", hex.encode(all).length, 512);

t.done("ekko:text/encoding covered");
