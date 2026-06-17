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

describe("store.create", () => {
  test("returns string id", () => {
    const id = auth.store.create({ userId: "u1" });
    expect(typeof id).toBe("string");
  });

  test("returns unique ids", () => {
    const id1 = auth.store.create({ userId: "u1" });
    const id2 = auth.store.create({ userId: "u2" });
    expect(id1).not.toBe(id2);
  });

  test("with user object", () => {
    const id = auth.store.create({ userId: "u1", name: "Alice", role: "admin" });
    expect(typeof id).toBe("string");
    expect(id.length > 0).toBe(true);
  });

  test("with empty object", () => {
    const id = auth.store.create({});
    expect(typeof id).toBe("string");
    expect(id.length > 0).toBe(true);
  });
});

describe("store.get", () => {
  test("returns stored data", () => {
    const id = auth.store.create({ userId: "u1", name: "Alice" });
    const data = auth.store.get(id);
    expect(data).not.toBe(null);
    expect(data!.userId).toBe("u1");
    expect(data!.name).toBe("Alice");
  });

  test("returns null for unknown id", () => {
    const data = auth.store.get("nonexistent-session-id");
    expect(data).toBe(null);
  });

  test("preserves user data", () => {
    const userData = { userId: "u99", email: "u99@test.com", role: "editor", prefs: { theme: "dark" } };
    const id = auth.store.create(userData);
    const data = auth.store.get(id);
    expect(data!.userId).toBe("u99");
    expect(data!.email).toBe("u99@test.com");
    expect(data!.role).toBe("editor");
    expect(data!.prefs.theme).toBe("dark");
  });

  test("create then immediately get works", () => {
    const id = auth.store.create({ quick: true });
    const data = auth.store.get(id);
    expect(data).not.toBe(null);
    expect(data!.quick).toBe(true);
  });
});

describe("store.set", () => {
  test("updates session data", () => {
    const id = auth.store.create({ counter: 0 });
    auth.store.set(id, { counter: 1 });
    const data = auth.store.get(id);
    expect(data!.counter).toBe(1);
  });
});

describe("store.destroy", () => {
  test("removes session", () => {
    const id = auth.store.create({ userId: "u1" });
    auth.store.destroy(id);
    const data = auth.store.get(id);
    expect(data).toBe(null);
  });

  test("get after destroy returns null", () => {
    const id = auth.store.create({ userId: "u1" });
    expect(auth.store.get(id)).not.toBe(null);
    auth.store.destroy(id);
    expect(auth.store.get(id)).toBe(null);
  });

  test("destroy non-existent session does not crash", () => {
    auth.store.destroy("does-not-exist-session-id");
    expect(true).toBe(true);
  });
});

describe("session isolation", () => {
  test("multiple sessions coexist", () => {
    const id1 = auth.store.create({ userId: "u1" });
    const id2 = auth.store.create({ userId: "u2" });
    const id3 = auth.store.create({ userId: "u3" });
    expect(auth.store.get(id1)!.userId).toBe("u1");
    expect(auth.store.get(id2)!.userId).toBe("u2");
    expect(auth.store.get(id3)!.userId).toBe("u3");
  });

  test("session data is isolated between sessions", () => {
    const id1 = auth.store.create({ value: "A" });
    const id2 = auth.store.create({ value: "B" });
    auth.store.set(id1, { value: "A-updated" });
    expect(auth.store.get(id1)!.value).toBe("A-updated");
    expect(auth.store.get(id2)!.value).toBe("B");
  });
});
