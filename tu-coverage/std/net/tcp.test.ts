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
import { tcp } from "ekko:net";

describe("net.tcp - API shape", () => {
  test("tcp.connect is a function", () => {
    expect(typeof tcp.connect).toBe("function");
  });

  test("tcp.write is a function", () => {
    expect(typeof tcp.write).toBe("function");
  });

  test("tcp.read is a function", () => {
    expect(typeof tcp.read).toBe("function");
  });

  test("tcp.close is a function", () => {
    expect(typeof tcp.close).toBe("function");
  });

  test("tcp.listen is a function", () => {
    expect(typeof tcp.listen).toBe("function");
  });

  test("tcp.stopServer is a function", () => {
    expect(typeof tcp.stopServer).toBe("function");
  });
});

describe("net.tcp - listen", () => {
  test("tcp.listen on high port returns address string", () => {
    const addr = tcp.listen("127.0.0.1", 19876);
    expect(typeof addr).toBe("string");
    expect(addr).toContain("19876");
  });
});

describe("net.tcp - connect", () => {
  test("tcp.connect to listening port returns handle", async () => {
    tcp.listen("127.0.0.1", 19879);
    const conn = await tcp.connect("127.0.0.1", 19879);
    expect(typeof conn).toBe("number");
    expect(conn).toBeGreaterThan(0);
    tcp.close(conn);
  });
});

describe("net.tcp - write and read", () => {
  test("tcp.write sends data without error", async () => {
    tcp.listen("127.0.0.1", 19881);
    const conn = await tcp.connect("127.0.0.1", 19881);
    tcp.write(conn, "hello");
    tcp.close(conn);
  });
});

describe("net.tcp - close", () => {
  test("tcp.close closes a connection without error", async () => {
    tcp.listen("127.0.0.1", 19883);
    const conn = await tcp.connect("127.0.0.1", 19883);
    tcp.close(conn);
    expect(true).toBe(true);
  });
});
