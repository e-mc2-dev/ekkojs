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

let scopedDenies = false;
try { dns.resolve("example.com"); } catch (e) {
  scopedDenies = /PermissionError|net access denied|denied/.test(String((e as any)?.message ?? e));
}
if (!scopedDenies) {
  console.log("");
  console.log("✗ MISCONFIGURED — net-scope.e2e.ts must run with scoped --allow=net:127.0.0.1 (NOT --allow=net):");
  console.log("      ekko run --allow=net:127.0.0.1 e2e/system/net-scope.e2e.ts");
  console.log("  dns.resolve('example.com') was ALLOWED → grant is too broad.");
  console.log("ASSERTIONS 0 1");
  Ekko.exit(1);
}

(async () => {
  t.group("granular net:127.0.0.1 — allowed host works");
  const ip = await dns.resolve("127.0.0.1");
  t.eq("dns.resolve allowed host (127.0.0.1)", JSON.stringify(ip), JSON.stringify(["127.0.0.1"]));

  t.group("granular net:127.0.0.1 — other hosts denied (sync PermissionError)");
  t.denied("dns.resolve('example.com') denied", () => { dns.resolve("example.com"); });
  t.denied("dns.resolve('8.8.8.8') denied", () => { dns.resolve("8.8.8.8"); });
  t.denied("tcp.connect('example.com') denied", () => { tcp.connect("example.com", 80); });
  t.denied("tcp.connect('10.0.0.1') denied", () => { tcp.connect("10.0.0.1", 80); });
  
  t.denied("tcp.connect('2130706433') denied (decimal IP)", () => { tcp.connect("2130706433", 80); });
  t.denied("tcp.connect('localhost') denied (not the granted string)", () => { tcp.connect("localhost", 80); });

  t.group("granular net:127.0.0.1 — udp.send/tcp.listen enforce the host scope");
  const sock = udp.createSocket(0);
  t.denied("udp.send to 8.8.8.8 denied (was a scope bypass)", () => { udp.send(sock, "x", "8.8.8.8", 53); });
  t.denied("udp.send to 9.9.9.9 denied", () => { udp.send(sock, "x", "9.9.9.9", 53); });
  t.notThrows("udp.send to 127.0.0.1 (in scope) allowed", () => { udp.send(sock, "x", "127.0.0.1", 35995); });
  udp.close(sock);
  t.denied("tcp.listen bind 0.0.0.0 denied (all interfaces, out of scope)", () => { tcp.listen("0.0.0.0", 35996, () => {}); });
  const ok = tcp.listen("127.0.0.1", 35997, () => {});
  t.type("tcp.listen bind 127.0.0.1 (in scope) returns handle", ok, "number");
  (tcp as any).stopServer(ok);

  t.done("ekko:net security/host-scope");
})().catch((e) => { console.log("UNCAUGHT: " + String((e as any)?.message ?? e)); Ekko.exit(1); });
