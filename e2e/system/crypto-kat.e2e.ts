// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { hash, hashHex, hmac, pbkdf2, randomBytes } from "ekko:crypto";
import { asserter } from "../_harness";

const t = asserter();
const hx = (u: Uint8Array) => Array.from(u).map((b) => b.toString(16).padStart(2, "0")).join("");
const rep = (v: number, n: number) => new Uint8Array(n).fill(v);

t.group("SHA — full known-answer digests");
t.eq("sha1('abc')", hashHex("sha1", "abc"), "a9993e364706816aba3e25717850c26c9cd0d89d");
t.eq("sha256('abc')", hashHex("sha256", "abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
t.eq("sha256('')", hashHex("sha256", ""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
t.eq("sha384('abc')", hashHex("sha384", "abc"),
  "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7");
t.eq("sha512('abc')", hashHex("sha512", "abc"),
  "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f");
t.eq("sha512('')", hashHex("sha512", ""),
  "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e");

t.group("MD5 — RFC 1321 vectors (legacy)");
t.eq("md5('')", hashHex("md5", ""), "d41d8cd98f00b204e9800998ecf8427e");
t.eq("md5('abc')", hashHex("md5", "abc"), "900150983cd24fb0d6963f7d28e17f72");
t.eq("md5('message digest')", hashHex("md5", "message digest"), "f96b697d7cb7938d525a2f31aaf161d0");

t.group("HMAC — RFC 4231 TC1/TC2");
t.eq("hmac-sha256 TC1", hx(hmac("sha256", rep(0x0b, 20), "Hi There")),
  "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7");
t.eq("hmac-sha512 TC1", hx(hmac("sha512", rep(0x0b, 20), "Hi There")),
  "87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cdedaa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854");

t.eq("hmac-sha256 TC2 (Jefe)", hx(hmac("sha256", "Jefe", "what do ya want for nothing?")),
  "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
t.eq("hmac-sha512 TC2 (Jefe)", hx(hmac("sha512", "Jefe", "what do ya want for nothing?")),
  "164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737");

t.group("PBKDF2 — RFC 6070 TC1/TC2/TC3");
t.eq("pbkdf2 c=1", hx(pbkdf2("password", "salt", 1, "sha1", 20)), "0c60c80f961f0e71f3a9b524af6012062fe037a6");
t.eq("pbkdf2 c=2", hx(pbkdf2("password", "salt", 2, "sha1", 20)), "ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957");
t.eq("pbkdf2 c=4096", hx(pbkdf2("password", "salt", 4096, "sha1", 20)), "4b007901b765489abead49d926f721d065a429c1");

t.group("no weak fallback");
t.throws("unknown hash algo throws (not silent weak)", () => hash("sha3-not-real" as any, "x"), /./);
t.ne("CSPRNG non-deterministic (no fixed/Math.random fallback)", hx(randomBytes(32)), hx(randomBytes(32)));
t.eq("randomBytes(64) full length", randomBytes(64).length, 64);

t.done("ekko:crypto re-KAT (W4.6)");
