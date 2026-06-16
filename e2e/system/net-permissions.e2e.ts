// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { tcp, udp, dns } from "ekko:net";
import { asserter } from "../_harness.ts";

const t = asserter();

let denied = false;
try { udp.createSocket(0); } catch (e) {
  denied = /PermissionError|net access denied|denied/.test(String((e as any)?.message ?? e));
}
if (!denied) {
  console.log("");
  console.log("✗ MISCONFIGURED — net-permissions.e2e.ts must run WITHOUT --allow=net:");
  console.log("      ekko run e2e/system/net-permissions.e2e.ts        (no --allow)");
  console.log("  udp.createSocket was ALLOWED → you granted `net`.");
  console.log("ASSERTIONS 0 1");
  Ekko.exit(1);
}

t.group("tcp / udp / dns denied without --allow=net");
t.denied("tcp.connect denied", () => { tcp.connect("127.0.0.1", 80); });
t.denied("tcp.listen denied", () => { tcp.listen("127.0.0.1", 35821, "h"); });
t.denied("udp.createSocket denied", () => { udp.createSocket(0); });
t.denied("dns.resolve denied", () => { dns.resolve("localhost"); });

t.done("ekko:net security/permission");
