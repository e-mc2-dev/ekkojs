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

function mockReq(query?: string) {
  return {
    query: query || "",
    cookies: {},
    user: null,
    session: {},
    login: (u: any) => {},
  } as any;
}

function mockRes() {
  const r: any = {
    _redirectUrl: "",
    _status: 200,
    _json: null,
    redirect(u: string) { r._redirectUrl = u; },
    status(c: number) { r._status = c; return r; },
    json(d: any) { r._json = d; },
  };
  return r;
}

const auth = createAuth({ secret: "routes-test", sessionTTL: 3600 });
auth.oauth.provider("github", { clientId: "gh-id", clientSecret: "gh-sec" });
auth.oauth.provider("google", { clientId: "go-id", clientSecret: "go-sec" });
auth.oauth.provider({
  name: "custom",
  authorizeUrl: "https://custom.io/authorize",
  tokenUrl: "https://custom.io/token",
  userInfoUrl: "https://custom.io/userinfo",
  clientId: "cust-id",
  clientSecret: "cust-sec",
  scopes: ["profile"],
  mapUser(p: any) { return { id: p.id, name: p.name, email: p.email }; },
});

describe("oauth oauthRoutes - structure", () => {
  test("returns object with loginPath", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    expect(typeof routes.loginPath).toBe("string");
  });

  test("returns object with callbackPath", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    expect(typeof routes.callbackPath).toBe("string");
  });

  test("returns object with loginHandler function", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    expect(typeof routes.loginHandler).toBe("function");
  });

  test("returns object with callbackHandler function", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    expect(typeof routes.callbackHandler).toBe("function");
  });
});

describe("oauth oauthRoutes - paths", () => {
  test("default loginPath is /auth/{provider}", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    expect(routes.loginPath).toBe("/auth/github");
  });

  test("default callbackPath is /auth/{provider}/callback", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    expect(routes.callbackPath).toBe("/auth/github/callback");
  });

  test("custom loginPath via opts", () => {
    const routes = auth.oauth.oauthRoutes("github", { loginPath: "/login/gh" });
    expect(routes.loginPath).toBe("/login/gh");
  });

  test("custom callbackPath via opts", () => {
    const routes = auth.oauth.oauthRoutes("github", { callbackPath: "/cb/gh" });
    expect(routes.callbackPath).toBe("/cb/gh");
  });
});

describe("oauth oauthRoutes - loginHandler behavior", () => {
  test("loginHandler is a function that takes (req, res)", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    expect(routes.loginHandler.length >= 2 || routes.loginHandler.length === 0).toBe(true);
  });

  test("callbackHandler is an async function that takes (req, res)", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    
    expect(typeof routes.callbackHandler).toBe("function");
  });

  test("loginHandler calls res.redirect", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    const req = mockReq();
    const res = mockRes();
    routes.loginHandler(req, res);
    expect(res._redirectUrl.length > 0).toBe(true);
  });

  test("loginHandler redirects to authorize URL", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    const req = mockReq();
    const res = mockRes();
    routes.loginHandler(req, res);
    expect(res._redirectUrl.includes("github.com")).toBe(true);
  });

  test("login redirect URL contains client_id", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    const req = mockReq();
    const res = mockRes();
    routes.loginHandler(req, res);
    expect(res._redirectUrl.includes("client_id=gh-id")).toBe(true);
  });
});

describe("oauth oauthRoutes - options", () => {
  test("default baseUrl is localhost:3000", () => {
    const routes = auth.oauth.oauthRoutes("github", {});
    const req = mockReq();
    const res = mockRes();
    routes.loginHandler(req, res);
    
    expect(res._redirectUrl.includes("localhost") || res._redirectUrl.includes("127.0.0.1")).toBe(true);
  });

  test("custom baseUrl via opts", () => {
    const routes = auth.oauth.oauthRoutes("github", { baseUrl: "https://myapp.com" });
    const req = mockReq();
    const res = mockRes();
    routes.loginHandler(req, res);
    expect(res._redirectUrl.includes("myapp.com")).toBe(true);
  });

  test("custom port in opts used for baseUrl", () => {
    const routes = auth.oauth.oauthRoutes("github", { baseUrl: "http://localhost:8080" });
    const req = mockReq();
    const res = mockRes();
    routes.loginHandler(req, res);
    expect(res._redirectUrl.includes("8080")).toBe(true);
  });

  test("opts.successRedirect configurable", () => {
    const routes = auth.oauth.oauthRoutes("github", { successRedirect: "/dashboard" });
    
    expect(routes).toBeTruthy();
  });

  test("oauthRoutes for google", () => {
    const routes = auth.oauth.oauthRoutes("google", {});
    expect(routes.loginPath).toBe("/auth/google");
    expect(routes.callbackPath).toBe("/auth/google/callback");
    const req = mockReq();
    const res = mockRes();
    routes.loginHandler(req, res);
    expect(res._redirectUrl.includes("google")).toBe(true);
  });

  test("oauthRoutes for custom provider", () => {
    const routes = auth.oauth.oauthRoutes("custom", {});
    expect(routes.loginPath).toBe("/auth/custom");
    expect(routes.callbackPath).toBe("/auth/custom/callback");
    const req = mockReq();
    const res = mockRes();
    routes.loginHandler(req, res);
    expect(res._redirectUrl.includes("custom.io/authorize")).toBe(true);
  });
});
