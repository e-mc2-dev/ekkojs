// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { describe, test, expect } from "ekko:test";
import { tcp, dns, udp } from "ekko:net";

describe("net.tcp - error cases", () => {
  test("tcp.connect to closed port throws", async () => {
    let threw = false;
    try {
      await tcp.connect("127.0.0.1", 19899);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("tcp.write on invalid handle does not crash", () => {
    
    tcp.write(0, "data-after-close");
    expect(true).toBe(true);
  });

  test("tcp.close on invalid handle does not crash", () => {
    tcp.close(0);
    expect(true).toBe(true);
  });
});

describe("net.dns - error cases", () => {
  test("dns.resolve with empty string does not crash", async () => {
    let completed = false;
    try {
      await dns.resolve("");
    } catch {
      
    }
    completed = true;
    expect(completed).toBe(true);
  });

  test("dns.resolve with null-like input throws", async () => {
    let threw = false;
    try {
      await dns.resolve(null as any);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe("net.udp - error cases", () => {
  test("udp.send to invalid address does not crash", () => {
    const socket = udp.createSocket(0);
    
    let threw = false;
    try {
      udp.send(socket, "data", "999.999.999.999", 0);
    } catch {
      threw = true;
    }
    
    expect(true).toBe(true);
    udp.close(socket);
  });
});
