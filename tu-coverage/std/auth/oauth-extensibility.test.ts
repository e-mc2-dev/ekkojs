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

describe("oauth extensibility - minimal and default config", () => {
  test("register provider with minimal config + defaults", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "minimal",
      authorizeUrl: "https://min.io/auth",
      tokenUrl: "https://min.io/token",
      userInfoUrl: "https://min.io/user",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
    });
    expect(auth.oauth.providers.minimal).toBeTruthy();
    expect(typeof auth.oauth.providers.minimal.mapUser).toBe("function");
  });

  test("register provider with custom scopes", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "scoped",
      authorizeUrl: "https://scoped.io/auth",
      tokenUrl: "https://scoped.io/token",
      userInfoUrl: "https://scoped.io/user",
      clientId: "c",
      clientSecret: "s",
      scopes: ["openid", "profile", "email", "phone", "address"],
    });
    expect(auth.oauth.providers.scoped.scopes.length).toBe(5);
    expect(auth.oauth.providers.scoped.scopes[3]).toBe("phone");
  });

  test("override built-in provider config (github with custom scopes)", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider("github", { clientId: "id", clientSecret: "sec" });
    
    auth.oauth.provider({
      name: "github",
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      userInfoUrl: "https://api.github.com/user",
      clientId: "custom-gh-id",
      clientSecret: "custom-gh-sec",
      scopes: ["user", "repo", "gist"],
    });
    expect(auth.oauth.providers.github.clientId).toBe("custom-gh-id");
    expect(auth.oauth.providers.github.scopes.length).toBe(3);
    expect(auth.oauth.providers.github.scopes[1]).toBe("repo");
  });

  test("multiple custom providers coexist", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "provider-a",
      authorizeUrl: "https://a.io/auth",
      tokenUrl: "https://a.io/token",
      userInfoUrl: "https://a.io/user",
      clientId: "a-id",
      clientSecret: "a-sec",
      scopes: ["a-scope"],
    });
    auth.oauth.provider({
      name: "provider-b",
      authorizeUrl: "https://b.io/auth",
      tokenUrl: "https://b.io/token",
      userInfoUrl: "https://b.io/user",
      clientId: "b-id",
      clientSecret: "b-sec",
      scopes: ["b-scope"],
    });
    auth.oauth.provider({
      name: "provider-c",
      authorizeUrl: "https://c.io/auth",
      tokenUrl: "https://c.io/token",
      userInfoUrl: "https://c.io/user",
      clientId: "c-id",
      clientSecret: "c-sec",
      scopes: ["c-scope"],
    });
    expect(auth.oauth.providers["provider-a"]).toBeTruthy();
    expect(auth.oauth.providers["provider-b"]).toBeTruthy();
    expect(auth.oauth.providers["provider-c"]).toBeTruthy();
    expect(auth.oauth.providers["provider-a"].clientId).toBe("a-id");
    expect(auth.oauth.providers["provider-b"].clientId).toBe("b-id");
    expect(auth.oauth.providers["provider-c"].clientId).toBe("c-id");
  });
});

describe("oauth extensibility - mapUser variations", () => {
  test("provider with unusual field names in mapUser", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "unusual",
      authorizeUrl: "https://u.io/auth",
      tokenUrl: "https://u.io/token",
      userInfoUrl: "https://u.io/user",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
      mapUser(p: any) {
        return {
          id: p.user_identifier,
          name: p.display_handle,
          email: p.electronic_mail,
          avatar: p.photo_link,
        };
      },
    });
    const result = auth.oauth.providers.unusual.mapUser({
      user_identifier: "uid-999",
      display_handle: "WeirdUser",
      electronic_mail: "weird@provider.net",
      photo_link: "https://photos.io/999.jpg",
    });
    expect(result.id).toBe("uid-999");
    expect(result.name).toBe("WeirdUser");
    expect(result.email).toBe("weird@provider.net");
    expect(result.avatar).toBe("https://photos.io/999.jpg");
  });

  test("custom mapUser with complex transformation", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "complex",
      authorizeUrl: "https://c.io/auth",
      tokenUrl: "https://c.io/token",
      userInfoUrl: "https://c.io/user",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
      mapUser(p: any) {
        return {
          id: `${p.org}-${p.uid}`,
          name: `${p.first} ${p.last}`.trim(),
          email: `${p.username}@${p.domain}`,
          avatar: p.photos?.[0] || null,
        };
      },
    });
    const result = auth.oauth.providers.complex.mapUser({
      org: "acme",
      uid: "007",
      first: "James",
      last: "Bond",
      username: "jbond",
      domain: "mi6.gov.uk",
      photos: ["https://mi6.gov.uk/agents/007.jpg"],
    });
    expect(result.id).toBe("acme-007");
    expect(result.name).toBe("James Bond");
    expect(result.email).toBe("jbond@mi6.gov.uk");
    expect(result.avatar).toBe("https://mi6.gov.uk/agents/007.jpg");
  });

  test("mapUser that returns extra fields (preserved)", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "extra",
      authorizeUrl: "https://e.io/auth",
      tokenUrl: "https://e.io/token",
      userInfoUrl: "https://e.io/user",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
      mapUser(p: any) {
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          avatar: p.avatar,
          role: p.role,
          org: p.org,
          tier: p.tier,
        };
      },
    });
    const result = auth.oauth.providers.extra.mapUser({
      id: "1", name: "Extra", email: "e@e.com", avatar: null,
      role: "admin", org: "corp", tier: "enterprise",
    });
    expect(result.role).toBe("admin");
    expect(result.org).toBe("corp");
    expect(result.tier).toBe("enterprise");
  });

  test("mapUser that renames fields", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "renamed",
      authorizeUrl: "https://r.io/auth",
      tokenUrl: "https://r.io/token",
      userInfoUrl: "https://r.io/user",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
      mapUser(p: any) {
        return {
          id: p.subject,
          name: p.preferred_username,
          email: p.email_verified ? p.email : null,
        };
      },
    });
    const result = auth.oauth.providers.renamed.mapUser({
      subject: "sub-123",
      preferred_username: "cooluser",
      email: "cool@user.com",
      email_verified: true,
    });
    expect(result.id).toBe("sub-123");
    expect(result.name).toBe("cooluser");
    expect(result.email).toBe("cool@user.com");
  });
});

describe("oauth extensibility - provider without userInfoUrl", () => {
  test("provider without userInfoUrl (token-only flow)", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    
    auth.oauth.provider({
      name: "tokenonly",
      authorizeUrl: "https://t.io/auth",
      tokenUrl: "https://t.io/token",
      userInfoUrl: "",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
    });
    expect(auth.oauth.providers.tokenonly).toBeTruthy();
    expect(auth.oauth.providers.tokenonly.userInfoUrl).toBe("");
  });
});

describe("oauth extensibility - re-registration and overwrite", () => {
  test("re-registering same name overwrites", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "overwrite-me",
      authorizeUrl: "https://v1.io/auth",
      tokenUrl: "https://v1.io/token",
      userInfoUrl: "https://v1.io/user",
      clientId: "old-client",
      clientSecret: "old-secret",
      scopes: ["v1"],
    });
    expect(auth.oauth.providers["overwrite-me"].clientId).toBe("old-client");

    auth.oauth.provider({
      name: "overwrite-me",
      authorizeUrl: "https://v2.io/auth",
      tokenUrl: "https://v2.io/token",
      userInfoUrl: "https://v2.io/user",
      clientId: "new-client",
      clientSecret: "new-secret",
      scopes: ["v2"],
    });
    expect(auth.oauth.providers["overwrite-me"].clientId).toBe("new-client");
    expect(auth.oauth.providers["overwrite-me"].authorizeUrl).toBe("https://v2.io/auth");
    expect(auth.oauth.providers["overwrite-me"].scopes[0]).toBe("v2");
  });

  test("provider with empty scopes array", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "noscopes",
      authorizeUrl: "https://ns.io/auth",
      tokenUrl: "https://ns.io/token",
      userInfoUrl: "https://ns.io/user",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
    });
    expect(Array.isArray(auth.oauth.providers.noscopes.scopes)).toBe(true);
    expect(auth.oauth.providers.noscopes.scopes.length).toBe(0);
  });
});

describe("oauth extensibility - instance independence", () => {
  test("provider config is independent per createAuth instance", () => {
    const auth1 = createAuth({ secret: "s1", sessionTTL: 3600 });
    const auth2 = createAuth({ secret: "s2", sessionTTL: 3600 });

    auth1.oauth.provider({
      name: "isolated",
      authorizeUrl: "https://iso.io/auth",
      tokenUrl: "https://iso.io/token",
      userInfoUrl: "https://iso.io/user",
      clientId: "auth1-client",
      clientSecret: "s",
      scopes: [],
    });

    expect(auth1.oauth.providers.isolated).toBeTruthy();
    expect(auth2.oauth.providers.isolated).toBeFalsy();
  });

  test("two auth instances can have different providers", () => {
    const auth1 = createAuth({ secret: "s1", sessionTTL: 3600 });
    const auth2 = createAuth({ secret: "s2", sessionTTL: 3600 });

    auth1.oauth.provider("github", { clientId: "gh-1", clientSecret: "sec-1" });
    auth2.oauth.provider("google", { clientId: "go-2", clientSecret: "sec-2" });

    expect(auth1.oauth.providers.github).toBeTruthy();
    expect(auth1.oauth.providers.google).toBeFalsy();
    expect(auth2.oauth.providers.google).toBeTruthy();
    expect(auth2.oauth.providers.github).toBeFalsy();
  });

  test("provider with all optional fields omitted (just required ones)", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "barebones",
      authorizeUrl: "https://bb.io/auth",
      tokenUrl: "https://bb.io/token",
      userInfoUrl: "https://bb.io/user",
      clientId: "bare-id",
      clientSecret: "bare-sec",
      scopes: [],
    });
    const p = auth.oauth.providers.barebones;
    expect(p.name || "barebones").toBe("barebones");
    expect(p.authorizeUrl).toBe("https://bb.io/auth");
    expect(p.tokenUrl).toBe("https://bb.io/token");
    expect(p.clientId).toBe("bare-id");
    expect(typeof p.mapUser).toBe("function");
  });

  test("provider with extra custom fields (preserved)", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "withextra",
      authorizeUrl: "https://ex.io/auth",
      tokenUrl: "https://ex.io/token",
      userInfoUrl: "https://ex.io/user",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
      customField: "hello",
      anotherField: 42,
    } as any);
    const p = auth.oauth.providers.withextra;
    expect(p).toBeTruthy();
    
    expect(p.clientId).toBe("c");
    expect(p.authorizeUrl).toBe("https://ex.io/auth");
  });
});
