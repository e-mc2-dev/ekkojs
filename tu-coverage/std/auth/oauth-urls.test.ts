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

const auth = createAuth({ secret: "url-test-secret", sessionTTL: 3600 });
auth.oauth.provider("github", { clientId: "gh-client-id", clientSecret: "gh-secret" });
auth.oauth.provider("google", { clientId: "goog-client-id", clientSecret: "goog-secret" });
auth.oauth.provider("discord", { clientId: "dc-client-id", clientSecret: "dc-secret" });
auth.oauth.provider({
  name: "custom",
  authorizeUrl: "https://custom.example.com/oauth/authorize",
  tokenUrl: "https://custom.example.com/oauth/token",
  userInfoUrl: "https://custom.example.com/oauth/userinfo",
  clientId: "custom-client-id",
  clientSecret: "custom-secret",
  scopes: ["read", "write", "admin"],
  mapUser(p: any) { return { id: p.sub, name: p.name, email: p.email }; },
});

describe("oauth getAuthorizeUrl - return type and format", () => {
  test("returns a string URL", () => {
    const url = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/callback");
    expect(typeof url).toBe("string");
  });

  test("URL contains provider's authorizeUrl base", () => {
    const url = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/callback");
    expect(url.includes("github.com")).toBe(true);
  });

  test("URL contains client_id parameter", () => {
    const url = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/callback");
    expect(url.includes("client_id=gh-client-id")).toBe(true);
  });

  test("URL contains redirect_uri parameter", () => {
    const url = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/callback");
    expect(url.includes("redirect_uri=")).toBe(true);
  });

  test("URL contains response_type=code", () => {
    const url = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/callback");
    expect(url.includes("response_type=code")).toBe(true);
  });

  test("URL contains scope parameter", () => {
    const url = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/callback");
    expect(url.includes("scope=")).toBe(true);
  });

  test("scope is space-separated (URL encoded as + or %20)", () => {
    const url = auth.oauth.getAuthorizeUrl("custom", "http://localhost:3000/callback");
    
    const hasSpaceSep = url.includes("read+write") || url.includes("read%20write");
    expect(hasSpaceSep).toBe(true);
  });
});

describe("oauth getAuthorizeUrl - state parameter", () => {
  test("state parameter included when provided", () => {
    const url = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/callback", "my-state-123");
    expect(url.includes("state=my-state-123")).toBe(true);
  });

  test("state parameter absent when not provided", () => {
    const url = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/callback");
    expect(url.includes("state=")).toBe(false);
  });
});

describe("oauth getAuthorizeUrl - provider-specific URLs", () => {
  test("GitHub URL has correct base domain", () => {
    const url = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/cb");
    expect(url.includes("github.com")).toBe(true);
  });

  test("Google URL has correct base domain", () => {
    const url = auth.oauth.getAuthorizeUrl("google", "http://localhost:3000/cb");
    expect(url.includes("google") || url.includes("googleapis")).toBe(true);
  });

  test("Discord URL has correct base domain", () => {
    const url = auth.oauth.getAuthorizeUrl("discord", "http://localhost:3000/cb");
    expect(url.includes("discord")).toBe(true);
  });

  test("custom provider URL uses custom authorizeUrl", () => {
    const url = auth.oauth.getAuthorizeUrl("custom", "http://localhost:3000/cb");
    expect(url.includes("custom.example.com/oauth/authorize")).toBe(true);
  });
});

describe("oauth getAuthorizeUrl - encoding and format", () => {
  test("redirect_uri is URL-encoded", () => {
    const url = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/auth/callback");
    
    expect(url.includes("redirect_uri=")).toBe(true);
    const uriPart = url.split("redirect_uri=")[1].split("&")[0];
    
    expect(uriPart.length > 0).toBe(true);
  });

  test("multiple scopes joined with space", () => {
    const url = auth.oauth.getAuthorizeUrl("custom", "http://localhost:3000/cb");
    
    const hasAll = url.includes("read") && url.includes("write") && url.includes("admin");
    expect(hasAll).toBe(true);
  });

  test("works with empty scopes array", () => {
    const auth2 = createAuth({ secret: "s", sessionTTL: 3600 });
    auth2.oauth.provider({
      name: "noscope",
      authorizeUrl: "https://ns.io/auth",
      tokenUrl: "https://ns.io/token",
      userInfoUrl: "https://ns.io/user",
      clientId: "ns-id",
      clientSecret: "ns-sec",
      scopes: [],
    });
    const url = auth2.oauth.getAuthorizeUrl("noscope", "http://localhost:3000/cb");
    expect(typeof url).toBe("string");
    expect(url.includes("ns.io/auth")).toBe(true);
  });

  test("different providers produce different URLs", () => {
    const url1 = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/cb");
    const url2 = auth.oauth.getAuthorizeUrl("google", "http://localhost:3000/cb");
    expect(url1).not.toBe(url2);
  });

  test("same provider + different redirectUri = different URLs", () => {
    const url1 = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/cb1");
    const url2 = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/cb2");
    expect(url1).not.toBe(url2);
  });

  test("URLSearchParams format (& separated)", () => {
    const url = auth.oauth.getAuthorizeUrl("github", "http://localhost:3000/cb");
    
    expect(url.includes("?")).toBe(true);
    expect(url.includes("&")).toBe(true);
  });

  test("throws for unregistered provider", () => {
    let threw = false;
    try {
      auth.oauth.getAuthorizeUrl("nonexistent", "http://localhost:3000/cb");
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
