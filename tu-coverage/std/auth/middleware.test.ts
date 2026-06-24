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

function mockReq(cookies?: any, user?: any) {
  return { cookies: cookies || {}, user: user || null, session: {}, headers: {} } as any;
}

function mockRes() {
  const r: any = { _status: 200, _json: null, _cookies: {} };
  r.status = (c: number) => { r._status = c; return r; };
  r.json = (d: any) => { r._json = d; };
  r.cookie = (n: string, v: string, o: any) => { r._cookies[n] = v; return r; };
  return r;
}

describe("auth middleware types", () => {
  test("auth.session is a function", () => {
    expect(typeof auth.session).toBe("function");
  });

  test("auth.required() returns a function", () => {
    const mw = auth.required();
    expect(typeof mw).toBe("function");
  });

  test("auth.roles('admin') returns a function", () => {
    const mw = auth.roles("admin");
    expect(typeof mw).toBe("function");
  });
});

describe("required middleware", () => {
  test("calls res.status(401) when no user", () => {
    const mw = auth.required();
    const req = mockReq();
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res._status).toBe(401);
  });

  test("calls next() when user present", () => {
    const mw = auth.required();
    const req = mockReq({}, { id: "u1", role: "user" });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});

describe("roles middleware", () => {
  test("calls res.status(403) when wrong role", () => {
    const mw = auth.roles("admin");
    const req = mockReq({}, { id: "u1", role: "user" });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res._status).toBe(403);
  });

  test("calls next() when role matches", () => {
    const mw = auth.roles("admin");
    const req = mockReq({}, { id: "u1", role: "admin" });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});

describe("session middleware behavior", () => {
  test("sets req.session", () => {
    const req = mockReq();
    const res = mockRes();
    let nextCalled = false;
    auth.session(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.session).not.toBe(null);
    expect(typeof req.session).toBe("object");
  });

  test("adds req.login function", () => {
    const req = mockReq();
    const res = mockRes();
    auth.session(req, res, () => {});
    expect(typeof req.login).toBe("function");
  });

  test("adds req.logout function", () => {
    const req = mockReq();
    const res = mockRes();
    auth.session(req, res, () => {});
    expect(typeof req.logout).toBe("function");
  });

  test("req.login sets req.user", () => {
    const req = mockReq();
    const res = mockRes();
    auth.session(req, res, () => {});
    req.login({ id: "u1", role: "admin" });
    expect(req.user).not.toBe(null);
    expect(req.user.id).toBe("u1");
    expect(req.user.role).toBe("admin");
  });

  test("req.logout clears req.user", () => {
    const req = mockReq();
    const res = mockRes();
    auth.session(req, res, () => {});
    req.login({ id: "u1", role: "admin" });
    expect(req.user).not.toBe(null);
    req.logout();
    expect(req.user).toBe(null);
  });
});
