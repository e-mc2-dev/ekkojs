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
const c: [string, boolean][] = [];

const b64 = base64.encode(utf8.encode("Hello, world!"));
c.push(["base64 encode", b64 === "SGVsbG8sIHdvcmxkIQ=="]);
const b64d = utf8.decode(base64.decode(b64));
c.push(["base64 roundtrip", b64d === "Hello, world!"]);

const b64u = base64.encodeUrl(utf8.encode("Hello+World/Test="));
c.push(["base64url no +/=", !b64u.includes("+") && !b64u.includes("/") && !b64u.includes("=")]);
const b64ud = utf8.decode(base64.decodeUrl(b64u));
c.push(["base64url roundtrip", b64ud === "Hello+World/Test="]);

const h = hex.encode(new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]));
c.push(["hex encode", h === "deadbeef"]);
const hd = hex.decode("cafebabe");
c.push(["hex decode", hd[0] === 0xCA && hd[3] === 0xBE]);

const u8 = utf8.encode("EkkoJS 🚀");
c.push(["utf8 encode", u8 instanceof Uint8Array && u8.length > 7]);
const u8d = utf8.decode(u8);
c.push(["utf8 roundtrip", u8d === "EkkoJS 🚀"]);

const u16 = utf16.encode("AB");
c.push(["utf16 LE encode", u16.length === 4 && u16[0] === 0x41 && u16[1] === 0x00]);
const u16d = utf16.decode(u16);
c.push(["utf16 LE roundtrip", u16d === "AB"]);

const u16be = utf16.encodeBE("AB");
c.push(["utf16 BE encode", u16be.length === 4 && u16be[0] === 0x00 && u16be[1] === 0x41]);
const u16bed = utf16.decodeBE(u16be);
c.push(["utf16 BE roundtrip", u16bed === "AB"]);

let p=0,f=0;for(const[n,ok]of c){if(ok){p++;console.log("  PASS:",n)}else{f++;console.log("  FAIL:",n)}}
console.log(`\n${p}/${p+f} passed`+(f>0?` (${f} FAILED)`:" — ALL PASS"));
