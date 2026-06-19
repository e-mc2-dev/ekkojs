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
import { z } from "ekko:web/validate";

describe("z.body middleware", () => {
  test("z.body returns a function", () => {
    const mw = z.body(z.object({ name: z.string() }));
    expect(typeof mw).toBe("function");
  });

  test("z.body sets req.validated on valid input", () => {
    const schema = z.object({ name: z.string() });
    const mw = z.body(schema);
    const req: any = { json: () => ({ name: "Alice" }) };
    const res: any = { status: () => res, json: () => {} };
    let called = false;
    mw(req, res, () => { called = true; });
    expect(called).toBe(true);
    expect(req.validated.name).toBe("Alice");
  });

  test("z.body calls res.status(400) on invalid input", () => {
    const schema = z.object({ name: z.string() });
    const mw = z.body(schema);
    const req: any = { json: () => ({ name: 42 }) };
    let statusCode = 0;
    let jsonResponse: any = null;
    const res: any = {
      status: (code: number) => { statusCode = code; return res; },
      json: (data: any) => { jsonResponse = data; },
    };
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(400);
    expect(jsonResponse.error).toBe("Validation failed");
  });

  test("z.body with complex schema validates correctly", () => {
    const schema = z.object({
      user: z.object({ name: z.string(), age: z.number() }),
      active: z.boolean(),
    });
    const mw = z.body(schema);
    const req: any = { json: () => ({ user: { name: "Bob", age: 25 }, active: true }) };
    const res: any = { status: () => res, json: () => {} };
    let called = false;
    mw(req, res, () => { called = true; });
    expect(called).toBe(true);
    expect(req.validated.user.name).toBe("Bob");
    expect(req.validated.active).toBe(true);
  });
});

describe("z.query middleware", () => {
  test("z.query returns a function", () => {
    const mw = z.query(z.object({ page: z.string() }));
    expect(typeof mw).toBe("function");
  });

  test("z.query parses query string", () => {
    const schema = z.object({ page: z.string(), limit: z.string() });
    const mw = z.query(schema);
    const req: any = { query: "?page=1&limit=10" };
    const res: any = { status: () => res, json: () => {} };
    let called = false;
    mw(req, res, () => { called = true; });
    expect(called).toBe(true);
    expect(req.validated.page).toBe("1");
    expect(req.validated.limit).toBe("10");
  });
});

describe("z.params middleware", () => {
  test("z.params returns a function", () => {
    const mw = z.params(z.object({ id: z.string() }));
    expect(typeof mw).toBe("function");
  });

  test("z.params validates params object", () => {
    const schema = z.object({ id: z.string() });
    const mw = z.params(schema);
    const req: any = { params: { id: "abc123" } };
    const res: any = { status: () => res, json: () => {} };
    let called = false;
    mw(req, res, () => { called = true; });
    expect(called).toBe(true);
    expect(req.validated.id).toBe("abc123");
  });

  test("z.params rejects invalid params", () => {
    const schema = z.object({ id: z.number() });
    const mw = z.params(schema);
    const req: any = { params: { id: "not-a-number" } };
    let statusCode = 0;
    const res: any = {
      status: (code: number) => { statusCode = code; return res; },
      json: () => {},
    };
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(400);
  });
});
