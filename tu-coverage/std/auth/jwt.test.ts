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
import { createAuth } from "ekko:auth";

const auth = createAuth({ secret: "test-secret", sessionTTL: 3600 });

describe("jwt.sign", () => {
  test("returns a string", () => {
    const token = auth.jwt.sign({ userId: "u1" }, 3600);
    expect(typeof token).toBe("string");
  });

  test("result has 3 dot-separated parts", () => {
    const token = auth.jwt.sign({ userId: "u1" }, 3600);
    const parts = token.split(".");
    expect(parts.length).toBe(3);
  });

  test("with different payloads produces different tokens", () => {
    const t1 = auth.jwt.sign({ userId: "u1" }, 3600);
    const t2 = auth.jwt.sign({ userId: "u2" }, 3600);
    expect(t1).not.toBe(t2);
  });

  test("with 0 expiresIn", () => {
    const token = auth.jwt.sign({ userId: "u1" }, 0);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });
});

describe("jwt.verify", () => {
  test("returns payload on valid token", () => {
    const token = auth.jwt.sign({ userId: "u1" }, 3600);
    const payload = auth.jwt.verify(token);
    expect(payload).not.toBe(null);
    expect(payload!.userId).toBe("u1");
  });

  test("returns null on invalid token", () => {
    const result = auth.jwt.verify("not.a.token");
    expect(result).toBe(null);
  });

  test("returns null on tampered token", () => {
    const token = auth.jwt.sign({ userId: "u1" }, 3600);
    const parts = token.split(".");
    parts[1] = parts[1] + "tampered";
    const tampered = parts.join(".");
    const result = auth.jwt.verify(tampered);
    expect(result).toBe(null);
  });

  test("returns null on token signed with different secret", () => {
    const other = createAuth({ secret: "other-secret", sessionTTL: 3600 });
    const token = other.jwt.sign({ userId: "u1" }, 3600);
    const result = auth.jwt.verify(token);
    expect(result).toBe(null);
  });
});

describe("jwt.decode", () => {
  test("returns payload without verification", () => {
    const token = auth.jwt.sign({ userId: "u1", role: "admin" }, 3600);
    const payload = auth.jwt.decode(token);
    expect(payload).not.toBe(null);
    expect(payload!.userId).toBe("u1");
    expect(payload!.role).toBe("admin");
  });

  test("returns null on garbage", () => {
    const result = auth.jwt.decode("complete-garbage");
    expect(result).toBe(null);
  });
});

describe("jwt payload claims", () => {
  test("preserves userId", () => {
    const token = auth.jwt.sign({ userId: "user-42" }, 3600);
    const payload = auth.jwt.verify(token);
    expect(payload!.userId).toBe("user-42");
  });

  test("preserves custom fields", () => {
    const token = auth.jwt.sign({ userId: "u1", email: "a@b.com", admin: true }, 3600);
    const payload = auth.jwt.verify(token);
    expect(payload!.email).toBe("a@b.com");
    expect(payload!.admin).toBe(true);
  });

  test("token with expiresIn has exp claim", () => {
    const token = auth.jwt.sign({ userId: "u1" }, 3600);
    const payload = auth.jwt.decode(token);
    expect(typeof payload!.exp).toBe("number");
  });

  test("iat (issued at) is present", () => {
    const token = auth.jwt.sign({ userId: "u1" }, 3600);
    const payload = auth.jwt.decode(token);
    expect(typeof payload!.iat).toBe("number");
  });
});
