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
import { createServer } from "ekko:web";

const MOCK_PORT = 19850;
const MOCK_HOST = "127.0.0.1";
const MOCK_BASE = `http://${MOCK_HOST}:${MOCK_PORT}`;

const mockServer = createServer({ port: MOCK_PORT, host: MOCK_HOST });

let lastTokenRequest: any = null;
let lastProfileAuthHeader: string = "";

mockServer.post("/token", (req: any, res: any) => {
  const body = req.json();
  lastTokenRequest = body;
  if (body.code === "valid-code" || body.code === "valid-code-2") {
    const token = body.code === "valid-code" ? "mock-token-123" : "mock-token-456";
    res.json({ access_token: token, token_type: "bearer" });
  } else {
    res.status(400).json({ error: "bad_verification_code", error_description: "The code passed is incorrect" });
  }
});

mockServer.get("/userinfo", (req: any, res: any) => {
  lastProfileAuthHeader = req.headers?.authorization || req.header?.("authorization") || "";
  res.json({
    id: 42,
    login: "testuser",
    email: "test@example.com",
    avatar_url: "https://example.com/avatar.png",
  });
});

mockServer.get("/authorize", (req: any, res: any) => {
  res.json({ ok: true });
});

mockServer.start();

const auth = createAuth({ secret: "mock-test-secret", sessionTTL: 3600 });
auth.oauth.provider({
  name: "mock",
  authorizeUrl: `${MOCK_BASE}/authorize`,
  tokenUrl: `${MOCK_BASE}/token`,
  userInfoUrl: `${MOCK_BASE}/userinfo`,
  clientId: "test-client",
  clientSecret: "test-secret",
  scopes: ["profile"],
  mapUser(p: any) {
    return {
      id: String(p.id),
      name: p.login,
      email: p.email,
      avatar: p.avatar_url,
    };
  },
});

describe("oauth mock-server - authorize URL", () => {
  test("getAuthorizeUrl returns URL pointing to mock server", () => {
    const url = auth.oauth.getAuthorizeUrl("mock", `${MOCK_BASE}/callback`);
    expect(url.includes(`${MOCK_HOST}:${MOCK_PORT}/authorize`)).toBe(true);
  });
});

describe("oauth mock-server - handleCallback success", () => {
  test("handleCallback with valid code returns user object", async () => {
    const result = await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(result).toBeTruthy();
    expect(result.user).toBeTruthy();
  });

  test("handleCallback returns access_token", async () => {
    const result = await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(result.token).toBe("mock-token-123");
  });

  test("handleCallback user has correct id", async () => {
    const result = await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(result.user.id).toBe("42");
  });

  test("handleCallback user has correct name", async () => {
    const result = await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(result.user.name).toBe("testuser");
  });

  test("handleCallback user has correct email", async () => {
    const result = await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(result.user.email).toBe("test@example.com");
  });

  test("handleCallback returns profile from server", async () => {
    const result = await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(result.profile).toBeTruthy();
    expect(result.profile.id).toBe(42);
    expect(result.profile.login).toBe("testuser");
  });
});

describe("oauth mock-server - handleCallback error", () => {
  test("handleCallback with invalid code throws", async () => {
    let threw = false;
    try {
      await auth.oauth.handleCallback("mock", "invalid-code", `${MOCK_BASE}/callback`);
    } catch (e: any) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("handleCallback error mentions token exchange failed", async () => {
    let errorMsg = "";
    try {
      await auth.oauth.handleCallback("mock", "bad-code-xyz", `${MOCK_BASE}/callback`);
    } catch (e: any) {
      errorMsg = (e.message || String(e)).toLowerCase();
    }
    const relevant = errorMsg.includes("token") || errorMsg.includes("exchange") || errorMsg.includes("failed") || errorMsg.includes("error");
    expect(relevant).toBe(true);
  });
});

describe("oauth mock-server - full flow", () => {
  test("full flow: getAuthorizeUrl then handleCallback", async () => {
    const url = auth.oauth.getAuthorizeUrl("mock", `${MOCK_BASE}/callback`, "state-abc");
    expect(url.includes("client_id=test-client")).toBe(true);
    expect(url.includes("state=state-abc")).toBe(true);

    const result = await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(result.user.id).toBe("42");
    expect(result.token).toBe("mock-token-123");
  });

  test("multiple callbacks in sequence work", async () => {
    const r1 = await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    const r2 = await auth.oauth.handleCallback("mock", "valid-code-2", `${MOCK_BASE}/callback`);
    expect(r1.token).toBe("mock-token-123");
    expect(r2.token).toBe("mock-token-456");
  });

  test("different codes produce different results", async () => {
    const r1 = await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    const r2 = await auth.oauth.handleCallback("mock", "valid-code-2", `${MOCK_BASE}/callback`);
    expect(r1.token).not.toBe(r2.token);
  });
});

describe("oauth mock-server - token exchange details", () => {
  test("token exchange sends correct client_id", async () => {
    await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(lastTokenRequest.client_id).toBe("test-client");
  });

  test("token exchange sends correct client_secret", async () => {
    await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(lastTokenRequest.client_secret).toBe("test-secret");
  });

  test("token exchange sends correct code", async () => {
    await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(lastTokenRequest.code).toBe("valid-code");
  });

  test("token exchange sends correct redirect_uri", async () => {
    await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(lastTokenRequest.redirect_uri).toBe(`${MOCK_BASE}/callback`);
  });
});

describe("oauth mock-server - profile fetch details", () => {
  test("profile fetch uses Bearer token", async () => {
    await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(lastProfileAuthHeader.includes("Bearer") || lastProfileAuthHeader.includes("bearer")).toBe(true);
    expect(lastProfileAuthHeader.includes("mock-token-123")).toBe(true);
  });

  test("profile fetch gets correct user data", async () => {
    const result = await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(result.profile.email).toBe("test@example.com");
    expect(result.profile.avatar_url).toBe("https://example.com/avatar.png");
  });

  test("mapUser correctly transforms profile", async () => {
    const result = await auth.oauth.handleCallback("mock", "valid-code", `${MOCK_BASE}/callback`);
    expect(result.user.id).toBe("42");
    expect(result.user.name).toBe("testuser");
    expect(result.user.email).toBe("test@example.com");
    expect(result.user.avatar).toBe("https://example.com/avatar.png");
  });
});

describe("oauth mock-server - oauthRoutes integration", () => {
  test("oauthRoutes loginHandler redirects to mock authorize URL", () => {
    const routes = auth.oauth.oauthRoutes("mock", { baseUrl: MOCK_BASE });
    const req = { query: "", cookies: {}, user: null, session: {} } as any;
    const res: any = { _redirectUrl: "", redirect(u: string) { res._redirectUrl = u; } };
    routes.loginHandler(req, res);
    expect(res._redirectUrl.includes(`${MOCK_HOST}:${MOCK_PORT}/authorize`)).toBe(true);
    expect(res._redirectUrl.includes("client_id=test-client")).toBe(true);
  });
});

describe("oauth mock-server - cleanup", () => {
  test("mockServer.stop() cleans up", () => {
    mockServer.stop();
    expect(true).toBe(true);
  });
});
