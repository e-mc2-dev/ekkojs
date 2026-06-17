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

describe("oauth provider - auth.oauth object", () => {
  const auth = createAuth({ secret: "test-secret", sessionTTL: 3600 });

  test("auth.oauth is an object", () => {
    expect(typeof auth.oauth).toBe("object");
    expect(auth.oauth).not.toBeNull();
  });

  test("auth.oauth.provider is a function", () => {
    expect(typeof auth.oauth.provider).toBe("function");
  });

  test("auth.oauth.providers is an object", () => {
    expect(typeof auth.oauth.providers).toBe("object");
  });
});

describe("oauth provider - built-in provider registration", () => {
  test("register github with clientId/clientSecret succeeds", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider("github", { clientId: "gh-id", clientSecret: "gh-secret" });
    expect(auth.oauth.providers.github).toBeTruthy();
  });

  test("register google with clientId/clientSecret succeeds", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider("google", { clientId: "goog-id", clientSecret: "goog-secret" });
    expect(auth.oauth.providers.google).toBeTruthy();
  });

  test("register discord with clientId/clientSecret succeeds", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider("discord", { clientId: "dc-id", clientSecret: "dc-secret" });
    expect(auth.oauth.providers.discord).toBeTruthy();
  });

  test("registered provider appears in auth.oauth.providers", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider("github", { clientId: "id", clientSecret: "sec" });
    expect("github" in auth.oauth.providers).toBe(true);
  });

  test("auth.oauth.providers.github has authorizeUrl", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider("github", { clientId: "id", clientSecret: "sec" });
    expect(typeof auth.oauth.providers.github.authorizeUrl).toBe("string");
    expect(auth.oauth.providers.github.authorizeUrl.length > 0).toBe(true);
  });

  test("auth.oauth.providers.github has tokenUrl", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider("github", { clientId: "id", clientSecret: "sec" });
    expect(typeof auth.oauth.providers.github.tokenUrl).toBe("string");
    expect(auth.oauth.providers.github.tokenUrl.length > 0).toBe(true);
  });

  test("auth.oauth.providers.github has userInfoUrl", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider("github", { clientId: "id", clientSecret: "sec" });
    expect(typeof auth.oauth.providers.github.userInfoUrl).toBe("string");
    expect(auth.oauth.providers.github.userInfoUrl.length > 0).toBe(true);
  });

  test("auth.oauth.providers.github has scopes array", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider("github", { clientId: "id", clientSecret: "sec" });
    expect(Array.isArray(auth.oauth.providers.github.scopes)).toBe(true);
  });

  test("auth.oauth.providers.github has mapUser function", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider("github", { clientId: "id", clientSecret: "sec" });
    expect(typeof auth.oauth.providers.github.mapUser).toBe("function");
  });
});

describe("oauth provider - custom provider registration", () => {
  test("register custom provider with all required fields", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "custom-idp",
      authorizeUrl: "https://custom.example.com/authorize",
      tokenUrl: "https://custom.example.com/token",
      userInfoUrl: "https://custom.example.com/userinfo",
      clientId: "custom-client",
      clientSecret: "custom-secret",
      scopes: ["openid", "profile"],
      mapUser(p: any) { return { id: p.sub, name: p.name, email: p.email }; },
    });
    expect(auth.oauth.providers["custom-idp"]).toBeTruthy();
  });

  test("custom provider appears in providers object", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "myauth",
      authorizeUrl: "https://myauth.io/authorize",
      tokenUrl: "https://myauth.io/token",
      userInfoUrl: "https://myauth.io/userinfo",
      clientId: "cid",
      clientSecret: "csec",
      scopes: ["read"],
    });
    expect("myauth" in auth.oauth.providers).toBe(true);
  });

  test("custom provider preserves authorizeUrl", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "testprov",
      authorizeUrl: "https://testprov.dev/auth",
      tokenUrl: "https://testprov.dev/token",
      userInfoUrl: "https://testprov.dev/user",
      clientId: "c1",
      clientSecret: "s1",
      scopes: [],
    });
    expect(auth.oauth.providers.testprov.authorizeUrl).toBe("https://testprov.dev/auth");
  });

  test("custom provider preserves tokenUrl", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "testprov",
      authorizeUrl: "https://testprov.dev/auth",
      tokenUrl: "https://testprov.dev/token",
      userInfoUrl: "https://testprov.dev/user",
      clientId: "c1",
      clientSecret: "s1",
      scopes: [],
    });
    expect(auth.oauth.providers.testprov.tokenUrl).toBe("https://testprov.dev/token");
  });

  test("custom provider preserves clientId", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "testprov",
      authorizeUrl: "https://testprov.dev/auth",
      tokenUrl: "https://testprov.dev/token",
      userInfoUrl: "https://testprov.dev/user",
      clientId: "my-client-id-123",
      clientSecret: "s1",
      scopes: [],
    });
    expect(auth.oauth.providers.testprov.clientId).toBe("my-client-id-123");
  });

  test("custom provider preserves scopes", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "testprov",
      authorizeUrl: "https://testprov.dev/auth",
      tokenUrl: "https://testprov.dev/token",
      userInfoUrl: "https://testprov.dev/user",
      clientId: "c1",
      clientSecret: "s1",
      scopes: ["openid", "profile", "email"],
    });
    const scopes = auth.oauth.providers.testprov.scopes;
    expect(scopes.length).toBe(3);
    expect(scopes[0]).toBe("openid");
    expect(scopes[1]).toBe("profile");
    expect(scopes[2]).toBe("email");
  });

  test("custom provider with mapUser function", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    const myMapper = (p: any) => ({ id: p.sub, name: p.display_name, email: p.mail });
    auth.oauth.provider({
      name: "testprov",
      authorizeUrl: "https://testprov.dev/auth",
      tokenUrl: "https://testprov.dev/token",
      userInfoUrl: "https://testprov.dev/user",
      clientId: "c1",
      clientSecret: "s1",
      scopes: [],
      mapUser: myMapper,
    });
    expect(typeof auth.oauth.providers.testprov.mapUser).toBe("function");
  });

  test("custom mapUser is callable", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "testprov",
      authorizeUrl: "https://a.com/auth",
      tokenUrl: "https://a.com/token",
      userInfoUrl: "https://a.com/user",
      clientId: "c1",
      clientSecret: "s1",
      scopes: [],
      mapUser(p: any) { return { id: p.id, name: p.name, email: p.email }; },
    });
    const result = auth.oauth.providers.testprov.mapUser({ id: "123", name: "Bob", email: "bob@x.com" });
    expect(result.id).toBe("123");
    expect(result.name).toBe("Bob");
    expect(result.email).toBe("bob@x.com");
  });

  test("provider without name throws", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    let threw = false;
    try {
      auth.oauth.provider({ authorizeUrl: "x", tokenUrl: "y", userInfoUrl: "z", clientId: "c", clientSecret: "s", scopes: [] } as any);
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("provider without authorizeUrl throws", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    let threw = false;
    try {
      auth.oauth.provider({ name: "bad", tokenUrl: "y", userInfoUrl: "z", clientId: "c", clientSecret: "s", scopes: [] } as any);
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("provider without tokenUrl throws", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    let threw = false;
    try {
      auth.oauth.provider({ name: "bad", authorizeUrl: "x", userInfoUrl: "z", clientId: "c", clientSecret: "s", scopes: [] } as any);
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("provider without clientId throws", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    let threw = false;
    try {
      auth.oauth.provider({ name: "bad", authorizeUrl: "x", tokenUrl: "y", userInfoUrl: "z", clientSecret: "s", scopes: [] } as any);
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("provider without clientSecret throws", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    let threw = false;
    try {
      auth.oauth.provider({ name: "bad", authorizeUrl: "x", tokenUrl: "y", userInfoUrl: "z", clientId: "c", scopes: [] } as any);
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("default mapUser used when not provided", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "noop",
      authorizeUrl: "https://noop.io/auth",
      tokenUrl: "https://noop.io/token",
      userInfoUrl: "https://noop.io/user",
      clientId: "c1",
      clientSecret: "s1",
      scopes: ["profile"],
    });
    
    expect(typeof auth.oauth.providers.noop.mapUser).toBe("function");
    
    const result = auth.oauth.providers.noop.mapUser({ id: "99", name: "Default", email: "d@d.com" });
    expect(result.id).toBe("99");
    expect(result.name).toBe("Default");
    expect(result.email).toBe("d@d.com");
  });
});
