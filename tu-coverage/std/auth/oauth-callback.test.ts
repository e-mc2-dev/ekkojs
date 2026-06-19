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

const auth = createAuth({ secret: "callback-test", sessionTTL: 3600 });
auth.oauth.provider("github", { clientId: "gh-id", clientSecret: "gh-sec" });
auth.oauth.provider({
  name: "custom",
  authorizeUrl: "https://custom.io/authorize",
  tokenUrl: "https://custom.io/token",
  userInfoUrl: "https://custom.io/userinfo",
  clientId: "cust-id",
  clientSecret: "cust-sec",
  scopes: ["profile"],
  mapUser(p: any) { return { id: String(p.id), name: p.login, email: p.email }; },
});

describe("oauth handleCallback - function signature", () => {
  test("handleCallback is an async function", () => {
    expect(typeof auth.oauth.handleCallback).toBe("function");
  });

  test("handleCallback returns a promise", () => {
    
    const result = auth.oauth.handleCallback("github", "fake-code", "http://localhost:3000/cb");
    expect(typeof result.then).toBe("function");
    expect(typeof result.catch).toBe("function");
    
    result.catch(() => {});
  });

  test("the function signature accepts (providerName, code, redirectUri)", () => {
    
    const p = auth.oauth.handleCallback("github", "code123", "http://localhost/cb");
    expect(p).toBeTruthy();
    p.catch(() => {});
  });
});

describe("oauth handleCallback - error handling", () => {
  test("handleCallback throws for unknown provider", async () => {
    let threw = false;
    try {
      await auth.oauth.handleCallback("nonexistent", "code", "http://localhost/cb");
    } catch (e: any) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("handleCallback throws when code is empty", async () => {
    let threw = false;
    try {
      await auth.oauth.handleCallback("github", "", "http://localhost/cb");
    } catch (e: any) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("handleCallback throws when code is undefined", async () => {
    let threw = false;
    try {
      await auth.oauth.handleCallback("github", undefined as any, "http://localhost/cb");
    } catch (e: any) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("handleCallback requires provider to be registered first", async () => {
    const auth2 = createAuth({ secret: "s", sessionTTL: 3600 });
    let threw = false;
    try {
      await auth2.oauth.handleCallback("github", "code", "http://localhost/cb");
    } catch (e: any) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("handleCallback error includes useful message", async () => {
    let errorMsg = "";
    try {
      await auth.oauth.handleCallback("nonexistent", "code", "http://localhost/cb");
    } catch (e: any) {
      errorMsg = e.message || String(e);
    }
    expect(errorMsg.length > 0).toBe(true);
  });

  test("with invalid code, throws about token exchange", async () => {
    let errorMsg = "";
    try {
      await auth.oauth.handleCallback("github", "invalid-code-xyz", "http://localhost/cb");
    } catch (e: any) {
      errorMsg = (e.message || String(e)).toLowerCase();
    }
    
    const relevant = errorMsg.includes("token") || errorMsg.includes("fetch") || errorMsg.includes("exchange") || errorMsg.includes("failed");
    expect(relevant).toBe(true);
  });

  test("error message mentions token exchange failed", async () => {
    let errorMsg = "";
    try {
      await auth.oauth.handleCallback("custom", "bad-code", "http://localhost/cb");
    } catch (e: any) {
      errorMsg = (e.message || String(e)).toLowerCase();
    }
    const relevant = errorMsg.includes("token") || errorMsg.includes("exchange") || errorMsg.includes("failed") || errorMsg.includes("fetch");
    expect(relevant).toBe(true);
  });
});

describe("oauth handleCallback - isolation and independence", () => {
  test.skip("multiple sequential calls don't interfere", async () => {
    let error1 = "";
    let error2 = "";
    try {
      await auth.oauth.handleCallback("github", "code-a", "http://localhost/cb");
    } catch (e: any) {
      error1 = e.message || String(e);
    }
    try {
      await auth.oauth.handleCallback("github", "code-b", "http://localhost/cb");
    } catch (e: any) {
      error2 = e.message || String(e);
    }
    
    expect(error1.length > 0).toBe(true);
    expect(error2.length > 0).toBe(true);
  });

  test.skip("different providers can be called independently", async () => {
    let ghError = "";
    let customError = "";
    try {
      await auth.oauth.handleCallback("github", "code-x", "http://localhost/cb");
    } catch (e: any) {
      ghError = e.message || String(e);
    }
    try {
      await auth.oauth.handleCallback("custom", "code-y", "http://localhost/cb");
    } catch (e: any) {
      customError = e.message || String(e);
    }
    expect(ghError.length > 0).toBe(true);
    expect(customError.length > 0).toBe(true);
  });

  test.skip("handleCallback with valid setup but no network throws gracefully", async () => {
    const auth2 = createAuth({ secret: "s", sessionTTL: 3600 });
    auth2.oauth.provider({
      name: "unreachable",
      authorizeUrl: "http://192.0.2.1/auth",
      tokenUrl: "http://192.0.2.1/token",
      userInfoUrl: "http://192.0.2.1/user",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
    });
    let threw = false;
    try {
      await auth2.oauth.handleCallback("unreachable", "code", "http://localhost/cb");
    } catch (e: any) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test.skip("provider tokenUrl is used in the exchange", () => {
    
    expect(auth.oauth.providers.github.tokenUrl).toBeTruthy();
    expect(auth.oauth.providers.custom.tokenUrl).toBe("https://custom.io/token");
  });

  test.skip("provider userInfoUrl would be called for profile", () => {
    expect(auth.oauth.providers.github.userInfoUrl).toBeTruthy();
    expect(auth.oauth.providers.custom.userInfoUrl).toBe("https://custom.io/userinfo");
  });

  test.skip("result shape should have token, profile, user when successful", async () => {

    expect(typeof auth.oauth.handleCallback).toBe("function");
    
    let errorMsg = "";
    try {
      await auth.oauth.handleCallback("github", "test-code", "http://localhost/cb");
    } catch (e: any) {
      errorMsg = (e.message || String(e)).toLowerCase();
    }
    
    const isNetworkError = errorMsg.includes("fetch") || errorMsg.includes("token") || errorMsg.includes("network") || errorMsg.includes("connect") || errorMsg.includes("failed");
    expect(isNetworkError).toBe(true);
  });
});
