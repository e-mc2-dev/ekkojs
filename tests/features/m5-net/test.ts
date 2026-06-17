// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { dns, tcp, udp } from "ekko:net";
const c: [string, boolean][] = [];

const addrs = await dns.resolve("google.com");
c.push(["dns.resolve returns array", Array.isArray(addrs) && addrs.length > 0]);

c.push(["tcp.connect exists", typeof tcp.connect === "function"]);
c.push(["tcp.write exists", typeof tcp.write === "function"]);
c.push(["tcp.read exists", typeof tcp.read === "function"]);
c.push(["tcp.close exists", typeof tcp.close === "function"]);
c.push(["tcp.listen exists", typeof tcp.listen === "function"]);

c.push(["udp.createSocket exists", typeof udp.createSocket === "function"]);
c.push(["udp.send exists", typeof udp.send === "function"]);
c.push(["udp.recv exists", typeof udp.recv === "function"]);
c.push(["udp.close exists", typeof udp.close === "function"]);

const sock = udp.createSocket(0);
c.push(["udp.createSocket returns handle", typeof sock === "number" && sock > 0]);
udp.close(sock);
c.push(["udp.close works", true]);

let p = 0, f = 0;
for (const [n, ok] of c) {
  if (ok) { p++; console.log("  PASS:", n); }
  else { f++; console.log("  FAIL:", n); }
}
console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
