// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { hash, hmac, randomBytes, randomUUID, hashHex } from "ekko:crypto";
const c: [string, boolean][] = [];

const h = hash("sha256", "hello");
c.push(["hash sha256 returns Uint8Array", h instanceof Uint8Array && h.length === 32]);

const h384 = hash("sha384", "hello");
c.push(["hash sha384 length", h384.length === 48]);

const h512 = hash("sha512", "hello");
c.push(["hash sha512 length", h512.length === 64]);

const hex = hashHex("sha256", "hello");
c.push(["hashHex is string", typeof hex === "string" && hex.length === 64]);

const m = hmac("sha256", "secret", "data");
c.push(["hmac sha256", m instanceof Uint8Array && m.length === 32]);

const rb = randomBytes(32);
c.push(["randomBytes(32)", rb instanceof Uint8Array && rb.length === 32]);
const rb2 = randomBytes(32);
c.push(["randomBytes unique", rb[0] !== rb2[0] || rb[1] !== rb2[1]]);

const uuid = randomUUID();
c.push(["randomUUID format", typeof uuid === "string" && uuid.length === 36 && uuid.includes("-")]);

c.push(["crypto.randomUUID", typeof crypto.randomUUID() === "string"]);

import { generateKey, encrypt, decrypt, pbkdf2, hkdf, rsaGenerateKeyPem, rsaSign, rsaVerify, ecdsaGenerateKeyPem, ecdsaSign, ecdsaVerify } from "ekko:crypto";

const gcmKey = generateKey("aes-256-gcm");
c.push(["generateKey aes-256-gcm", gcmKey instanceof Uint8Array && gcmKey.length === 32]);

const gcmEncrypted = encrypt("aes-256-gcm", gcmKey, "hello world");
c.push(["encrypt gcm", gcmEncrypted instanceof Uint8Array && gcmEncrypted.length > 0]);

const gcmDecrypted = decrypt("aes-256-gcm", gcmKey, gcmEncrypted);
c.push(["decrypt gcm roundtrip", String.fromCharCode(...gcmDecrypted) === "hello world"]);

const cbcKey = generateKey("aes-256-cbc");
c.push(["generateKey aes-256-cbc", cbcKey.length === 32]);

const cbcEncrypted = encrypt("aes-256-cbc", cbcKey, "secret data");
c.push(["encrypt cbc", cbcEncrypted instanceof Uint8Array && cbcEncrypted.length > 0]);

const cbcDecrypted = decrypt("aes-256-cbc", cbcKey, cbcEncrypted);
c.push(["decrypt cbc roundtrip", String.fromCharCode(...cbcDecrypted) === "secret data"]);

const gcm128Key = generateKey("aes-128-gcm");
c.push(["generateKey aes-128-gcm", gcm128Key.length === 16]);
const e128 = encrypt("aes-128-gcm", gcm128Key, "test128");
const d128 = decrypt("aes-128-gcm", gcm128Key, e128);
c.push(["aes-128-gcm roundtrip", String.fromCharCode(...d128) === "test128"]);

const dk = pbkdf2("password", "salt", 1000, "sha256", 32);
c.push(["pbkdf2 returns 32 bytes", dk instanceof Uint8Array && dk.length === 32]);

const dk2 = pbkdf2("password", "salt", 1000, "sha256", 32);
c.push(["pbkdf2 deterministic", dk[0] === dk2[0] && dk[31] === dk2[31]]);

const hk = hkdf("input-key", "salt", "info", "sha256", 64);
c.push(["hkdf returns 64 bytes", hk instanceof Uint8Array && hk.length === 64]);

const hk2 = hkdf("input-key", "salt", "info", "sha256", 64);
c.push(["hkdf deterministic", hk[0] === hk2[0] && hk[63] === hk2[63]]);

const rsaKeys = rsaGenerateKeyPem(2048);
c.push(["rsa keygen", typeof rsaKeys.publicKey === "string" && rsaKeys.publicKey.includes("PUBLIC KEY")]);

const rsaSig = rsaSign(rsaKeys.privateKey, "hello rsa");
c.push(["rsa sign", rsaSig instanceof Uint8Array && rsaSig.length > 0]);

const rsaOk = rsaVerify(rsaKeys.publicKey, "hello rsa", rsaSig);
c.push(["rsa verify", rsaOk === true]);

const rsaBad = rsaVerify(rsaKeys.publicKey, "wrong data", rsaSig);
c.push(["rsa verify bad data", rsaBad === false]);

const ecKeys = ecdsaGenerateKeyPem("P-256");
c.push(["ecdsa keygen", typeof ecKeys.publicKey === "string" && ecKeys.publicKey.includes("PUBLIC KEY")]);

const ecSig = ecdsaSign(ecKeys.privateKey, "hello ecdsa");
c.push(["ecdsa sign", ecSig instanceof Uint8Array && ecSig.length > 0]);

const ecOk = ecdsaVerify(ecKeys.publicKey, "hello ecdsa", ecSig);
c.push(["ecdsa verify", ecOk === true]);

const ecBad = ecdsaVerify(ecKeys.publicKey, "wrong", ecSig);
c.push(["ecdsa verify bad data", ecBad === false]);

let p = 0, f = 0;
for (const [n, ok] of c) {
  if (ok) { p++; console.log("  PASS:", n); }
  else { f++; console.log("  FAIL:", n); }
}
console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
