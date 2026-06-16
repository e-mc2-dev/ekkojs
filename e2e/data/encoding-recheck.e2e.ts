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
const FFFD = "�";

t.group(".NET base64 ignores ASCII whitespace (lock documented behavior)");
t.check("decode('Zm 9v') → foo", JSON.stringify(A(base64.decode("Zm 9v"))) === JSON.stringify([102, 111, 111]));
t.check("decode('Zm9v\\n') → foo", base64.decode("Zm9v\n").length === 3);
t.check("decode with tabs 'Zm9\\t9v...' tolerant", base64.decode("Zm9v\t").length === 3);

t.group(".NET hex decode is case-insensitive (lock)");
t.check("DEADbeef == deadbeef", JSON.stringify(A(hex.decode("DEADbeef"))) === JSON.stringify(A(hex.decode("deadbeef"))));
t.check("mixed case 0aFf", JSON.stringify(A(hex.decode("0aFf"))) === JSON.stringify([0x0a, 0xff]));

t.group("utf8 replacement fallback on invalid bytes (no throw)");
t.notThrows("decode([0xff,0xfe]) no throw", () => utf8.decode(U(0xff, 0xfe)));
t.check("decode([0xff,0xfe]) → U+FFFD", utf8.decode(U(0xff, 0xfe)).includes(FFFD));
t.check("overlong [0xc0,0x80] → U+FFFD", utf8.decode(U(0xc0, 0x80)).includes(FFFD));
t.check("lone continuation [0x80] → U+FFFD", utf8.decode(U(0x80)).includes(FFFD));
t.check("lone-surrogate enc [0xed,0xa0,0x80] → U+FFFD", utf8.decode(U(0xed, 0xa0, 0x80)).includes(FFFD));
t.check("valid+invalid 'A'+0xff → keeps A", utf8.decode(U(0x41, 0xff)).startsWith("A"));

t.group("utf16 odd-length / invalid → replacement (no throw)");
t.notThrows("LE decode 3 bytes no throw", () => utf16.decode(U(0x48, 0x00, 0x69)));
t.check("LE decode([0x48,0x00,0x69]) → 'H'+U+FFFD", utf16.decode(U(0x48, 0x00, 0x69)) === "H" + FFFD);
t.notThrows("BE decode 3 bytes no throw", () => utf16.decodeBE(U(0x00, 0x48, 0x69)));
t.check("LE lone high surrogate → U+FFFD", utf16.decode(U(0x00, 0xd8)).includes(FFFD));

t.group("extract_bytes footgun — string passed to *.encode uses its UTF-8 bytes (lock)");
t.eq("hex.encode('AB') → '4142'", hex.encode("AB" as unknown as Uint8Array), "4142");
t.eq("base64.encode('foo') → 'Zm9v'", base64.encode("foo" as unknown as Uint8Array), "Zm9v");

t.group("empties — empty input → empty output, no throw");
t.eq("base64.encode([]) → ''", base64.encode(U()), "");
t.eq("base64.decode('') → []", base64.decode("").length, 0);
t.eq("base64.encodeUrl([]) → ''", base64.encodeUrl(U()), "");
t.eq("base64.decodeUrl('') → []", base64.decodeUrl("").length, 0);
t.eq("hex.encode([]) → ''", hex.encode(U()), "");
t.eq("hex.decode('') → []", hex.decode("").length, 0);
t.eq("utf8.encode('') → []", utf8.encode("").length, 0);
t.eq("utf8.decode([]) → ''", utf8.decode(U()), "");
t.eq("utf16.encode('') → []", utf16.encode("").length, 0);
t.eq("utf16.decode([]) → ''", utf16.decode(U()), "");

t.group("large unicode + determinism");
const big = "Ω≈ç√∫日本😀".repeat(50_000);
t.eq("large utf8 round-trip", utf8.decode(utf8.encode(big)), big);
t.eq("large utf16 LE round-trip", utf16.decode(utf16.encode(big)), big);
t.eq("large utf16 BE round-trip", utf16.decodeBE(utf16.encodeBE(big)), big);
const sample = U(0, 1, 127, 128, 200, 255);
t.eq("base64 encode deterministic", base64.encode(sample), base64.encode(sample));
t.eq("hex encode deterministic", hex.encode(sample), hex.encode(sample));
t.eq("utf8 encode deterministic bytes", JSON.stringify(A(utf8.encode("déjà😀"))), JSON.stringify(A(utf8.encode("déjà😀"))));

t.done("ekko:text/encoding recheck");
