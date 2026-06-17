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
  hash, hashHex, hmac, generateKey, encrypt, decrypt, pbkdf2,
  rsaGenerateKeyPem, rsaSign, rsaVerify, ecdsaGenerateKeyPem, ecdsaSign, ecdsaVerify,
} from "ekko:crypto";
import { asserter } from "../_harness";

const t = asserter();
const hx = (u: Uint8Array) => Array.from(u).map((b) => b.toString(16).padStart(2, "0")).join("");

t.group("AES-GCM — auth/integrity (tamper, truncation, wrong key)");
const key = generateKey("aes-256-gcm");
const ct = encrypt("aes-256-gcm", key, "authenticated payload");

const tag = new Uint8Array(ct); tag[tag.length - 1] ^= 0xff;
t.throws("tamper tag byte → decrypt throws", () => decrypt("aes-256-gcm", key, tag), /./);

const mid = new Uint8Array(ct); mid[Math.floor(mid.length / 2)] ^= 0x01;
t.throws("tamper ciphertext byte → decrypt throws", () => decrypt("aes-256-gcm", key, mid), /./);

t.throws("truncated ciphertext → decrypt throws", () => decrypt("aes-256-gcm", key, ct.slice(0, ct.length - 4)), /./);

t.throws("wrong key → decrypt throws", () => decrypt("aes-256-gcm", generateKey("aes-256-gcm"), ct), /./);

const seen = new Set<string>();
for (let i = 0; i < 20; i++) seen.add(hx(encrypt("aes-256-gcm", key, "same")));
t.eq("20 encryptions of same pt → 20 distinct ct (random nonce)", seen.size, 20);

t.group("binary fidelity (all 256 byte values)");
const allBytes = new Uint8Array(256); for (let i = 0; i < 256; i++) allBytes[i] = i;
t.eq("AES-GCM round-trips arbitrary bytes", hx(decrypt("aes-256-gcm", key, encrypt("aes-256-gcm", key, allBytes))), hx(allBytes));
t.eq("hash of binary is stable length", hash("sha256", allBytes).length, 32);
t.eq("empty-input sha256 round-trips to known", hashHex("sha256", new Uint8Array(0)), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

t.group("determinism");
t.eq("hash deterministic", hashHex("sha256", "x"), hashHex("sha256", "x"));
t.eq("hmac deterministic", hx(hmac("sha256", "k", "x")), hx(hmac("sha256", "k", "x")));
t.eq("pbkdf2 deterministic", hx(pbkdf2("p", "s", 1000, "sha256", 32)), hx(pbkdf2("p", "s", 1000, "sha256", 32)));
t.ne("pbkdf2 iterations change output", hx(pbkdf2("p", "s", 1000, "sha256", 32)), hx(pbkdf2("p", "s", 2000, "sha256", 32)));
t.eq("pbkdf2 length param honored", pbkdf2("p", "s", 100, "sha256", 64).length, 64);

t.group("large input");
const big = "a".repeat(1024 * 1024);
t.eq("1MB sha256 length", hash("sha256", big).length, 32);
t.eq("1MB sha256 deterministic", hashHex("sha256", big), hashHex("sha256", big));

t.group("RSA/ECDSA — key & signature isolation");
const r1 = rsaGenerateKeyPem(2048), r2 = rsaGenerateKeyPem(2048);
const rsig = rsaSign(r1.privateKey, "m");
t.eq("RSA cross-key verify → false", rsaVerify(r2.publicKey, "m", rsig), false);
const rbad = new Uint8Array(rsig); rbad[0] ^= 0xff;
t.eq("RSA tampered signature → false", rsaVerify(r1.publicKey, "m", rbad), false);
const e1 = ecdsaGenerateKeyPem("P-256"), e2 = ecdsaGenerateKeyPem("P-256");
const esig = ecdsaSign(e1.privateKey, "m");
t.eq("ECDSA cross-key verify → false", ecdsaVerify(e2.publicKey, "m", esig), false);
t.eq("ECDSA valid still verifies", ecdsaVerify(e1.publicKey, "m", esig), true);

t.group("unknown algorithm → clean error");
t.throws("hash unknown algo throws", () => hash("sha999-not-real", "x"), /./);

t.done("ekko:crypto recheck");
