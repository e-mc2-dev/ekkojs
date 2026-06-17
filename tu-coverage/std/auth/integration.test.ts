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

describe("auth integration: password flow", () => {
  test("create auth + hash password + verify", () => {
    const auth = createAuth({ secret: "int-secret", sessionTTL: 3600 });
    const hash = auth.hashPassword("securePass!23");
    expect(auth.verifyPassword("securePass!23", hash)).toBe(true);
    expect(auth.verifyPassword("wrongPass", hash)).toBe(false);
  });
});

describe("auth integration: JWT flow", () => {
  test("create auth + JWT sign + verify roundtrip", () => {
    const auth = createAuth({ secret: "jwt-secret", sessionTTL: 3600 });
    const token = auth.jwt.sign({ userId: "user-1", role: "editor" }, 3600);
    const payload = auth.jwt.verify(token);
    expect(payload).not.toBe(null);
    expect(payload!.userId).toBe("user-1");
    expect(payload!.role).toBe("editor");
  });

  test("JWT payload roundtrip with nested object", () => {
    const auth = createAuth({ secret: "nested-secret", sessionTTL: 3600 });
    const nested = { userId: "u1", meta: { org: "acme", tier: "pro" } };
    const token = auth.jwt.sign(nested, 3600);
    const payload = auth.jwt.verify(token);
    expect(payload!.userId).toBe("u1");
    expect(payload!.meta.org).toBe("acme");
    expect(payload!.meta.tier).toBe("pro");
  });
});

describe("auth integration: session lifecycle", () => {
  test("session: create + get + destroy lifecycle", () => {
    const auth = createAuth({ secret: "sess-secret", sessionTTL: 3600 });
    const id = auth.store.create({ userId: "u1", name: "Alice" });
    expect(typeof id).toBe("string");

    const data = auth.store.get(id);
    expect(data).not.toBe(null);
    expect(data!.userId).toBe("u1");

    auth.store.destroy(id);
    expect(auth.store.get(id)).toBe(null);
  });

  test("two different auth instances have independent sessions", () => {
    const auth1 = createAuth({ secret: "s1", sessionTTL: 3600 });
    const auth2 = createAuth({ secret: "s2", sessionTTL: 3600 });

    const id1 = auth1.store.create({ owner: "auth1" });
    const id2 = auth2.store.create({ owner: "auth2" });

    expect(auth1.store.get(id1)!.owner).toBe("auth1");
    expect(auth2.store.get(id2)!.owner).toBe("auth2");

    expect(auth1.store.get(id2)).toBe(null);
    expect(auth2.store.get(id1)).toBe(null);
  });
});

describe("auth integration: configuration", () => {
  test("auth with custom secret", () => {
    const auth = createAuth({ secret: "my-custom-secret-key-12345", sessionTTL: 3600 });
    const token = auth.jwt.sign({ userId: "u1" }, 3600);
    const payload = auth.jwt.verify(token);
    expect(payload!.userId).toBe("u1");
  });

  test("auth with custom cookie name", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600, cookieName: "my_session" } as any);
    expect(typeof auth.session).toBe("function");
  });

  test("auth with custom sessionTTL", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 60 });
    const id = auth.store.create({ userId: "u1" });
    const data = auth.store.get(id);
    expect(data).not.toBe(null);
  });

  test("createAuth without options works (defaults)", () => {
    const auth = createAuth({} as any);
    expect(typeof auth.hashPassword).toBe("function");
    expect(typeof auth.verifyPassword).toBe("function");
    expect(typeof auth.jwt).toBe("object");
    expect(typeof auth.store).toBe("object");
    expect(typeof auth.session).toBe("function");
  });
});

describe("auth integration: session + login simulation", () => {
  test("session + login simulation", () => {
    const auth = createAuth({ secret: "login-test", sessionTTL: 3600 });

    const hash = auth.hashPassword("user-pass");
    expect(auth.verifyPassword("user-pass", hash)).toBe(true);

    const sessionId = auth.store.create({ userId: "u1", loggedIn: true });
    expect(auth.store.get(sessionId)!.loggedIn).toBe(true);

    const token = auth.jwt.sign({ userId: "u1", sessionId }, 3600);
    const payload = auth.jwt.verify(token);
    expect(payload!.userId).toBe("u1");
    expect(payload!.sessionId).toBe(sessionId);

    auth.store.destroy(sessionId);
    expect(auth.store.get(sessionId)).toBe(null);
  });
});
