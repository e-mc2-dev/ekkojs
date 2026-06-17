// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import * as c from "ekko:crypto";
import { asserter } from "../_harness";

const t = asserter();

let denied = false;
try { c.hashHex("sha256", "x"); } catch (e) {
  denied = /PermissionError|crypto access denied|denied/.test(String((e as any)?.message ?? e));
}
if (!denied) {
  console.log("");
  console.log("✗ MISCONFIGURED — crypto-permissions.e2e.ts must run WITHOUT --allow=crypto:");
  console.log("      ekko run e2e/system/crypto-permissions.e2e.ts        (no --allow)");
  console.log("  hash was ALLOWED → you granted `crypto`.");
  console.log("ASSERTIONS 0 1");
  Ekko.exit(1);
}

t.group("all crypto functions denied without --allow=crypto");
t.denied("hash denied", () => c.hash("sha256", "x"));
t.denied("hashHex denied", () => c.hashHex("sha256", "x"));
t.denied("hmac denied", () => c.hmac("sha256", "k", "x"));
t.denied("randomBytes denied", () => c.randomBytes(8));
t.denied("randomUUID denied", () => c.randomUUID());
t.denied("generateKey denied", () => c.generateKey("aes-256-gcm"));
t.denied("encrypt denied", () => c.encrypt("aes-256-gcm", new Uint8Array(32), "x"));
t.denied("decrypt denied", () => c.decrypt("aes-256-gcm", new Uint8Array(32), new Uint8Array(32)));
t.denied("pbkdf2 denied", () => c.pbkdf2("p", "s", 1));
t.denied("hkdf denied", () => c.hkdf("ikm", "salt"));
t.denied("rsaGenerateKeyPem denied", () => c.rsaGenerateKeyPem(2048));
t.denied("rsaSign denied", () => c.rsaSign("pem", "x"));
t.denied("rsaVerify denied", () => c.rsaVerify("pem", "x", new Uint8Array(8)));

t.denied("ecdsaGenerateKeyPem denied (was a bypass)", () => c.ecdsaGenerateKeyPem("P-256"));
t.denied("ecdsaSign denied (was a bypass)", () => c.ecdsaSign("pem", "x"));
t.denied("ecdsaVerify denied (was a bypass)", () => c.ecdsaVerify("pem", "x", new Uint8Array(8)));

t.done("ekko:crypto security/permission");
