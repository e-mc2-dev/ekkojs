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
import { cors, rateLimit, helmet, bodyLimit, csrf, timeout, requestId, createServer } from "ekko:web";

const PORT_MW = 19930;

describe("middleware - cors", () => {
  test("cors is a function", () => {
    expect(typeof cors).toBe("function");
  });

  test("cors() returns a middleware function", () => {
    const mw = cors();
    expect(typeof mw).toBe("function");
  });
});

describe("middleware - rateLimit", () => {
  test("rateLimit is a function", () => {
    expect(typeof rateLimit).toBe("function");
  });

  test("rateLimit({}) returns a middleware function", () => {
    const mw = rateLimit({});
    expect(typeof mw).toBe("function");
  });
});

describe("middleware - helmet", () => {
  test("helmet is a function", () => {
    expect(typeof helmet).toBe("function");
  });

  test("helmet() returns a middleware function", () => {
    const mw = helmet();
    expect(typeof mw).toBe("function");
  });
});

describe("middleware - bodyLimit", () => {
  test("bodyLimit is a function", () => {
    expect(typeof bodyLimit).toBe("function");
  });

  test("bodyLimit() returns a middleware function", () => {
    const mw = bodyLimit();
    expect(typeof mw).toBe("function");
  });
});

describe("middleware - csrf", () => {
  test("csrf is a function", () => {
    expect(typeof csrf).toBe("function");
  });

  test("csrf() returns a middleware function", () => {
    const mw = csrf();
    expect(typeof mw).toBe("function");
  });
});

describe("middleware - timeout", () => {
  test("timeout is a function", () => {
    expect(typeof timeout).toBe("function");
  });

  test("timeout(5000) returns a middleware function", () => {
    const mw = timeout(5000);
    expect(typeof mw).toBe("function");
  });
});

describe("middleware - requestId", () => {
  test("requestId is a function", () => {
    expect(typeof requestId).toBe("function");
  });

  test("requestId() returns a middleware function", () => {
    const mw = requestId();
    expect(typeof mw).toBe("function");
  });
});

describe("middleware - integration with server", () => {
  test("middleware can be applied to a server", async () => {
    const server = createServer({ port: PORT_MW, host: "127.0.0.1" });
    server.use(cors());
    server.use(helmet());
    server.use(requestId());

    server.get("/mw-test", (_req: any, res: any) => {
      res.text("middleware-ok");
    });

    server.start();

    const res = await fetch(`http://127.0.0.1:${PORT_MW}/mw-test`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe("middleware-ok");

    server.stop();
  });

  test("all middleware factories return distinct functions", () => {
    const fns = [cors(), rateLimit({}), helmet(), bodyLimit(), csrf(), timeout(5000), requestId()];
    for (let i = 0; i < fns.length; i++) {
      expect(typeof fns[i]).toBe("function");
      for (let j = i + 1; j < fns.length; j++) {
        expect(fns[i] !== fns[j]).toBe(true);
      }
    }
  });
});
