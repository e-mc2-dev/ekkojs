// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import {
  hash, hashHex, hmac, randomBytes, randomUUID, generateKey, encrypt, decrypt,
  pbkdf2, hkdf, rsaGenerateKeyPem, rsaSign, rsaVerify, ecdsaGenerateKeyPem, ecdsaSign, ecdsaVerify,
} from "ekko:crypto";
import { asserter } from "../_harness.ts";

const t = asserter();
const hx = (u: Uint8Array) => Array.from(u).map((b) => b.toString(16).padStart(2, "0")).join("");
const rep = (v: number, n: number) => new Uint8Array(n).fill(v);
const bytes = (...n: number[]) => new Uint8Array(n);

t.group("hash / hashHex — known-answer tests");
t.eq("sha256('abc')", hashHex("sha256", "abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
t.eq("sha256('') (empty)", hashHex("sha256", ""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
t.eq("sha1('abc')", hashHex("sha1", "abc"), "a9993e364706816aba3e25717850c26c9cd0d89d");
t.ok("sha512('abc') prefix", hashHex("sha512", "abc").startsWith("ddaf35a193617aba"));
t.eq("hash() returns raw bytes (sha256 = 32)", hash("sha256", "abc").length, 32);
t.eq("hash()==hashHex() consistency", hx(hash("sha256", "abc")), hashHex("sha256", "abc"));

t.group("hmac — RFC 4231");
t.eq("hmac-sha256 RFC4231 TC1", hx(hmac("sha256", rep(0x0b, 20), "Hi There")),
  "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7");

t.group("pbkdf2 / hkdf — RFC vectors");
t.eq("pbkdf2 RFC6070 TC1", hx(pbkdf2("password", "salt", 1, "sha1", 20)), "0c60c80f961f0e71f3a9b524af6012062fe037a6");
t.eq("hkdf RFC5869 TC1 (L=42)",
  hx(hkdf(rep(0x0b, 22), bytes(0,1,2,3,4,5,6,7,8,9,10,11,12), bytes(0xf0,0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,0xf9), "sha256", 42)),
  "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865");

t.group("randomBytes / randomUUID");
t.eq("randomBytes(32) length", randomBytes(32).length, 32);
t.eq("randomBytes(0) length", randomBytes(0).length, 0);
t.ne("randomBytes distinct", hx(randomBytes(32)), hx(randomBytes(32)));
const uuid = randomUUID();
t.ok("randomUUID v4 format", /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid));
t.ne("randomUUID distinct", randomUUID(), randomUUID());

t.group("AES-256-GCM — generate / encrypt / decrypt");
const key = generateKey("aes-256-gcm");
t.eq("generateKey aes-256-gcm length 32", key.length, 32);
const ct = encrypt("aes-256-gcm", key, "secret message");
const pt = decrypt("aes-256-gcm", key, ct);
t.eq("AES-GCM round-trip", new TextDecoder().decode(pt), "secret message");
t.ne("AES-GCM nonce uniqueness (same pt+key → diff ct)", hx(encrypt("aes-256-gcm", key, "x")), hx(encrypt("aes-256-gcm", key, "x")));

t.group("RSA — generate / sign / verify");
const rsa = rsaGenerateKeyPem(2048);
t.ok("RSA public key PEM", /BEGIN (RSA )?PUBLIC KEY|BEGIN PUBLIC KEY/.test(rsa.publicKey));
const rsig = rsaSign(rsa.privateKey, "doc");
t.eq("RSA verify valid", rsaVerify(rsa.publicKey, "doc", rsig), true);
t.eq("RSA verify tampered data → false", rsaVerify(rsa.publicKey, "doc2", rsig), false);

t.group("ECDSA — generate / sign / verify");
const ec = ecdsaGenerateKeyPem("P-256");
t.ok("ECDSA public key PEM", /BEGIN (EC )?PUBLIC KEY|BEGIN PUBLIC KEY/.test(ec.publicKey));
const esig = ecdsaSign(ec.privateKey, "tx");
t.eq("ECDSA verify valid", ecdsaVerify(ec.publicKey, "tx", esig), true);
t.eq("ECDSA verify tampered data → false", ecdsaVerify(ec.publicKey, "tx2", esig), false);

t.done("ekko:crypto");
