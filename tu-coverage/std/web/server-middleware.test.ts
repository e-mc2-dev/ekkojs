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
import {
  cors, rateLimit, helmet, bodyLimit, timeout,
  requestId, csrf, safePath, errorHandler,
  ipFilter, validateContentType, httpsRedirect,
  secureCookies, createServer,
} from "ekko:web";

describe("server-middleware - cors", () => {
  test("cors() middleware returns function", () => {
    const mw = cors();
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - rateLimit", () => {
  test("rateLimit({}) middleware returns function", () => {
    const mw = rateLimit({});
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - helmet", () => {
  test("helmet() returns function", () => {
    const mw = helmet();
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - bodyLimit", () => {
  test("bodyLimit(1024) returns function", () => {
    const mw = bodyLimit(1024);
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - timeout", () => {
  test("timeout(5000) returns function", () => {
    const mw = timeout(5000);
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - requestId", () => {
  test("requestId() returns function", () => {
    const mw = requestId();
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - csrf", () => {
  test("csrf() returns function", () => {
    const mw = csrf();
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - safePath", () => {
  test("safePath() returns function", () => {
    const mw = safePath();
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - errorHandler", () => {
  test("errorHandler() returns function", () => {
    const mw = errorHandler();
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - ipFilter", () => {
  test("ipFilter({}) returns function", () => {
    const mw = ipFilter({});
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - validateContentType", () => {
  test("validateContentType() returns function", () => {
    const mw = validateContentType();
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - httpsRedirect", () => {
  test("httpsRedirect() returns function", () => {
    const mw = httpsRedirect();
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - secureCookies", () => {
  test("secureCookies() returns function", () => {
    const mw = secureCookies();
    expect(typeof mw).toBe("function");
  });
});

describe("server-middleware - integration", () => {
  test("server.use(cors()) doesn't crash", () => {
    const server = createServer();
    server.use(cors());
    expect(server).toBeTruthy();
  });

  test("server.use(multiple middlewares) doesn't crash", () => {
    const server = createServer();
    server.use(cors());
    server.use(helmet());
    server.use(requestId());
    server.use(bodyLimit(2048));
    server.use(timeout(10000));
    server.use(csrf());
    server.use(safePath());
    server.use(errorHandler());
    server.use(httpsRedirect());
    server.use(secureCookies());
    expect(server).toBeTruthy();
  });
});
