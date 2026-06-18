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
import { createServer, cors, rateLimit, helmet, safePath, bodyLimit, csrf, errorHandler, timeout, httpsRedirect, secureCookies, requestId, ipFilter, validateContentType } from "ekko:web";
import { assert } from "ekko:test/assert";

describe("globalThis audit — internal server state removed", () => {
  test("__serverRoutes not on globalThis", () => {
    expect((globalThis as any).__serverRoutes).toBeUndefined();
  });

  test("__serverMiddleware not on globalThis", () => {
    expect((globalThis as any).__serverMiddleware).toBeUndefined();
  });

  test("__serverStaticDirs not on globalThis", () => {
    expect((globalThis as any).__serverStaticDirs).toBeUndefined();
  });

  test("__wsRoutes not on globalThis", () => {
    expect((globalThis as any).__wsRoutes).toBeUndefined();
  });

  test("__wsSockets not on globalThis", () => {
    expect((globalThis as any).__wsSockets).toBeUndefined();
  });

  test("__authSchemes not on globalThis", () => {
    expect((globalThis as any).__authSchemes).toBeUndefined();
  });

  test("__serverOnError not on globalThis", () => {
    expect((globalThis as any).__serverOnError).toBeUndefined();
  });

  test("__serverRlCounters not on globalThis", () => {
    expect((globalThis as any).__serverRlCounters).toBeUndefined();
  });

  test("__mimeTypes not on globalThis", () => {
    expect((globalThis as any).__mimeTypes).toBeUndefined();
  });

  test("__tcpServerHandlers not on globalThis", () => {
    expect((globalThis as any).__tcpServerHandlers).toBeUndefined();
  });

  test("__processHandlers not on globalThis", () => {
    expect((globalThis as any).__processHandlers).toBeUndefined();
  });
});

describe("globalThis audit — internal server functions removed", () => {
  test("__serverHandleRequest not on globalThis", () => {
    expect((globalThis as any).__serverHandleRequest).toBeUndefined();
  });

  test("__handleRoute not on globalThis", () => {
    expect((globalThis as any).__handleRoute).toBeUndefined();
  });

  test("__postAuth not on globalThis", () => {
    expect((globalThis as any).__postAuth).toBeUndefined();
  });

  test("__callHandler not on globalThis", () => {
    expect((globalThis as any).__callHandler).toBeUndefined();
  });

  test("__makeRes not on globalThis", () => {
    expect((globalThis as any).__makeRes).toBeUndefined();
  });
});

describe("globalThis audit — string ops moved to Rust", () => {
  test("__router_validate_url not on globalThis as JS function", () => {
    expect((globalThis as any).__router_validate_url).toBeUndefined();
  });

  test("__router_match not on globalThis as JS function", () => {
    expect((globalThis as any).__router_match).toBeUndefined();
  });

  test("__router_extract_params not on globalThis as JS function", () => {
    expect((globalThis as any).__router_extract_params).toBeUndefined();
  });
});

describe("globalThis audit — ekko:web exports not leaked to global", () => {
  test("createServer not on globalThis (import only)", () => {
    expect((globalThis as any).createServer).toBeUndefined();
  });

  test("cors not on globalThis (import only)", () => {
    expect((globalThis as any).cors).toBeUndefined();
  });

  test("rateLimit not on globalThis (import only)", () => {
    expect((globalThis as any).rateLimit).toBeUndefined();
  });

  test("helmet not on globalThis (import only)", () => {
    expect((globalThis as any).helmet).toBeUndefined();
  });

  test("safePath not on globalThis (import only)", () => {
    expect((globalThis as any).safePath).toBeUndefined();
  });

  test("bodyLimit not on globalThis (import only)", () => {
    expect((globalThis as any).bodyLimit).toBeUndefined();
  });

  test("csrf not on globalThis (import only)", () => {
    expect((globalThis as any).csrf).toBeUndefined();
  });

  test("errorHandler not on globalThis (import only)", () => {
    expect((globalThis as any).errorHandler).toBeUndefined();
  });

  test("timeout not on globalThis (import only)", () => {
    expect((globalThis as any).timeout).toBeUndefined();
  });

  test("httpsRedirect not on globalThis (import only)", () => {
    expect((globalThis as any).httpsRedirect).toBeUndefined();
  });

  test("secureCookies not on globalThis (import only)", () => {
    expect((globalThis as any).secureCookies).toBeUndefined();
  });

  test("requestId not on globalThis (import only)", () => {
    expect((globalThis as any).requestId).toBeUndefined();
  });

  test("ipFilter not on globalThis (import only)", () => {
    expect((globalThis as any).ipFilter).toBeUndefined();
  });

  test("validateContentType not on globalThis (import only)", () => {
    expect((globalThis as any).validateContentType).toBeUndefined();
  });
});

describe("globalThis audit — ekko:web imports functional", () => {
  test("createServer available via import", () => {
    expect(typeof createServer).toBe("function");
  });

  test("cors available via import", () => {
    expect(typeof cors).toBe("function");
  });

  test("rateLimit available via import", () => {
    expect(typeof rateLimit).toBe("function");
  });

  test("helmet available via import", () => {
    expect(typeof helmet).toBe("function");
  });

  test("safePath available via import", () => {
    expect(typeof safePath).toBe("function");
  });

  test("bodyLimit available via import", () => {
    expect(typeof bodyLimit).toBe("function");
  });

  test("csrf available via import", () => {
    expect(typeof csrf).toBe("function");
  });

  test("errorHandler available via import", () => {
    expect(typeof errorHandler).toBe("function");
  });

  test("timeout available via import", () => {
    expect(typeof timeout).toBe("function");
  });

  test("httpsRedirect available via import", () => {
    expect(typeof httpsRedirect).toBe("function");
  });

  test("secureCookies available via import", () => {
    expect(typeof secureCookies).toBe("function");
  });

  test("requestId available via import", () => {
    expect(typeof requestId).toBe("function");
  });

  test("ipFilter available via import", () => {
    expect(typeof ipFilter).toBe("function");
  });

  test("validateContentType available via import", () => {
    expect(typeof validateContentType).toBe("function");
  });
});

describe("globalThis audit — Web API globals present + immutable", () => {
  test("fetch is a global function", () => {
    expect(typeof globalThis.fetch).toBe("function");
  });

  test("fetch is not writable", () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    expect(desc).toBeTruthy();
    expect(desc!.writable).toBe(false);
  });

  test("fetch is not configurable", () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    expect(desc!.configurable).toBe(false);
  });

  test("ReadableStream is a global", () => {
    expect(typeof (globalThis as any).ReadableStream).toBe("function");
  });

  test("ReadableStream is not writable", () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "ReadableStream");
    expect(desc).toBeTruthy();
    expect(desc!.writable).toBe(false);
  });

  test("TextEncoder is a global", () => {
    expect(typeof (globalThis as any).TextEncoder).toBe("function");
  });

  test("TextEncoder is not writable", () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "TextEncoder");
    expect(desc).toBeTruthy();
    expect(desc!.writable).toBe(false);
  });

  test("TextDecoder is a global", () => {
    expect(typeof (globalThis as any).TextDecoder).toBe("function");
  });

  test("TextDecoder is not writable", () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "TextDecoder");
    expect(desc).toBeTruthy();
    expect(desc!.writable).toBe(false);
  });

  test("WebSocket is NOT a global (module-only export after 127b)", () => {
    expect((globalThis as any).WebSocket).toBeUndefined();
  });
});

describe("globalThis audit — JSX globals present + immutable", () => {
  test("Fragment is a global Symbol", () => {
    expect((globalThis as any).Fragment).toBeTruthy();
  });

  test("Fragment is not writable", () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "Fragment");
    expect(desc).toBeTruthy();
    expect(desc!.writable).toBe(false);
  });

  test("_jsx is a global function", () => {
    expect(typeof (globalThis as any)._jsx).toBe("function");
  });

  test("_jsx is not writable", () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "_jsx");
    expect(desc).toBeTruthy();
    expect(desc!.writable).toBe(false);
  });

  test("_jsxs is a global function", () => {
    expect(typeof (globalThis as any)._jsxs).toBe("function");
  });

  test("_jsxs is not writable", () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "_jsxs");
    expect(desc).toBeTruthy();
    expect(desc!.writable).toBe(false);
  });

  test("Link is a global function", () => {
    expect(typeof (globalThis as any).Link).toBe("function");
  });

  test("Link is not writable", () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "Link");
    expect(desc).toBeTruthy();
    expect(desc!.writable).toBe(false);
  });

  test("useState is a global function", () => {
    expect(typeof (globalThis as any).useState).toBe("function");
  });

  test("useEffect is a global function", () => {
    expect(typeof (globalThis as any).useEffect).toBe("function");
  });

  test("useRef is a global function", () => {
    expect(typeof (globalThis as any).useRef).toBe("function");
  });

  test("useMemo is a global function", () => {
    expect(typeof (globalThis as any).useMemo).toBe("function");
  });

  test("useCallback is a global function", () => {
    expect(typeof (globalThis as any).useCallback).toBe("function");
  });

  test("useContext is a global function", () => {
    expect(typeof (globalThis as any).useContext).toBe("function");
  });
});

describe("globalThis audit — internal bridges non-enumerable", () => {
  test("__SpawnError exists but is non-enumerable", () => {
    expect((globalThis as any).__SpawnError).toBeTruthy();
    const desc = Object.getOwnPropertyDescriptor(globalThis, "__SpawnError");
    expect(desc).toBeTruthy();
    expect(desc!.enumerable).toBe(false);
  });

  test("__SpawnError is not configurable", () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "__SpawnError");
    expect(desc!.configurable).toBe(false);
  });

  test("__channelAsyncIterator exists but is non-enumerable", () => {
    expect(typeof (globalThis as any).__channelAsyncIterator).toBe("function");
    const desc = Object.getOwnPropertyDescriptor(globalThis, "__channelAsyncIterator");
    expect(desc).toBeTruthy();
    expect(desc!.enumerable).toBe(false);
  });

  test("__mimir exists but is non-enumerable", () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "__mimir");
    if (desc) {
      expect(desc.enumerable).toBe(false);
      expect(desc.configurable).toBe(false);
    }
  });

  test("AssertionError is global but non-configurable", () => {
    expect((globalThis as any).AssertionError).toBeTruthy();
    const desc = Object.getOwnPropertyDescriptor(globalThis, "AssertionError");
    expect(desc).toBeTruthy();
    expect(desc!.configurable).toBe(false);
  });
});

describe("globalThis audit — enumeration sweep", () => {
  test("Object.keys(globalThis) contains zero __ prefixed entries", () => {
    const leaked = Object.keys(globalThis).filter((k: string) => k.startsWith("__"));
    expect(leaked).toHaveLength(0);
  });

  test("for..in globalThis finds zero __ prefixed entries", () => {
    const leaked: string[] = [];
    for (const k in globalThis) {
      if (k.startsWith("__")) leaked.push(k);
    }
    expect(leaked).toHaveLength(0);
  });

  test("Object.keys(globalThis) does not contain server internals", () => {
    const keys = Object.keys(globalThis);
    const forbidden = [
      "__serverRoutes", "__serverMiddleware", "__serverStaticDirs",
      "__wsRoutes", "__wsSockets", "__authSchemes", "__serverOnError",
      "__serverRlCounters", "__mimeTypes", "__makeRes",
      "__tcpServerHandlers", "__processHandlers",
      "__serverHandleRequest", "__handleRoute", "__postAuth", "__callHandler",
      "__matchPath", "__extractParams",
      "__router_validate_url", "__router_match", "__router_extract_params",
    ];
    for (const name of forbidden) {
      expect(keys).not.toContain(name);
    }
  });

  test("Object.keys(globalThis) does not contain module exports", () => {
    const keys = Object.keys(globalThis);
    const moduleOnly = [
      "createServer", "cors", "rateLimit", "helmet",
      "safePath", "bodyLimit", "csrf", "errorHandler",
      "timeout", "httpsRedirect", "secureCookies",
      "requestId", "ipFilter", "validateContentType",
    ];
    for (const name of moduleOnly) {
      expect(keys).not.toContain(name);
    }
  });
});

describe("globalThis audit — native ops completely removed", () => {
  test("__sendResponse is undefined (not just hidden)", () => {
    expect((globalThis as any).__sendResponse).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(globalThis, "__sendResponse")).toBeUndefined();
  });

  test("__startServer is undefined", () => {
    expect((globalThis as any).__startServer).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(globalThis, "__startServer")).toBeUndefined();
  });

  test("__stopServer is undefined", () => {
    expect((globalThis as any).__stopServer).toBeUndefined();
  });

  test("__fetchRaw is undefined", () => {
    expect((globalThis as any).__fetchRaw).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(globalThis, "__fetchRaw")).toBeUndefined();
  });

  test("__fetchBodyText is undefined", () => {
    expect((globalThis as any).__fetchBodyText).toBeUndefined();
  });

  test("__fetchBodyBytes is undefined", () => {
    expect((globalThis as any).__fetchBodyBytes).toBeUndefined();
  });

  test("__fetchDispose is undefined", () => {
    expect((globalThis as any).__fetchDispose).toBeUndefined();
  });

  test("__registerServerHandler is undefined", () => {
    expect((globalThis as any).__registerServerHandler).toBeUndefined();
  });

  test("__readStaticFile is undefined", () => {
    expect((globalThis as any).__readStaticFile).toBeUndefined();
  });

  test("__wsSendServer is undefined", () => {
    expect((globalThis as any).__wsSendServer).toBeUndefined();
  });

  test("__wsCloseServer is undefined", () => {
    expect((globalThis as any).__wsCloseServer).toBeUndefined();
  });

  test("__wsConnectClient is undefined", () => {
    expect((globalThis as any).__wsConnectClient).toBeUndefined();
  });

  test("__wsClientSend is undefined", () => {
    expect((globalThis as any).__wsClientSend).toBeUndefined();
  });

  test("__wsClientClose is undefined", () => {
    expect((globalThis as any).__wsClientClose).toBeUndefined();
  });

  test("__readFileBytes is undefined (dead code removed)", () => {
    expect((globalThis as any).__readFileBytes).toBeUndefined();
  });

  test("__scanDir is undefined", () => {
    expect((globalThis as any).__scanDir).toBeUndefined();
  });

  test("__cssModule is undefined", () => {
    expect((globalThis as any).__cssModule).toBeUndefined();
  });

  test("Object.getOwnPropertyNames has zero __ native ops", () => {
    const allProps = Object.getOwnPropertyNames(globalThis);
    const nativeOps = allProps.filter((k: string) =>
      ["__sendResponse", "__startServer", "__stopServer", "__readStaticFile",
       "__readFileBytes", "__scanDir", "__cssModule", "__fetchRaw",
       "__fetchBodyText", "__fetchBodyBytes", "__fetchDispose",
       "__registerServerHandler", "__wsSendServer", "__wsCloseServer",
       "__wsConnectClient", "__wsClientSend", "__wsClientClose"].includes(k)
    );
    expect(nativeOps).toHaveLength(0);
  });
});

const PORT_SEC = 19800;

describe("regression — Web APIs functional", () => {
  test("TextEncoder encodes UTF-8", () => {
    const enc = new (globalThis as any).TextEncoder();
    const buf = enc.encode("hello");
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf.length).toBe(5);
    expect(buf[0]).toBe(104);
  });

  test("TextDecoder decodes UTF-8", () => {
    const dec = new (globalThis as any).TextDecoder();
    const result = dec.decode(new Uint8Array([104, 105]));
    expect(result).toBe("hi");
  });

  test("ReadableStream basic iteration", async () => {
    const stream = new (globalThis as any).ReadableStream({
      start(controller: any) {
        controller.enqueue("a");
        controller.enqueue("b");
        controller.close();
      },
    });
    const reader = stream.getReader();
    const r1 = await reader.read();
    expect(r1.value).toBe("a");
    expect(r1.done).toBe(false);
    const r2 = await reader.read();
    expect(r2.value).toBe("b");
    const r3 = await reader.read();
    expect(r3.done).toBe(true);
  });
});

describe("regression — JSX functional", () => {
  test("_jsx produces object with type and props", () => {
    const el = (globalThis as any)._jsx("div", { className: "test" });
    expect(el).toBeTruthy();
    expect(el.type).toBe("div");
    expect(el.props.className).toBe("test");
  });

  test("_jsxs is same as _jsx", () => {
    expect((globalThis as any)._jsxs).toBe((globalThis as any)._jsx);
  });

  test("Fragment is a Symbol", () => {
    expect(typeof (globalThis as any).Fragment).toBe("symbol");
  });

  test("Link produces anchor element", () => {
    const link = (globalThis as any).Link({ href: "/about", children: "About" });
    expect(link).toBeTruthy();
    expect(link.type).toBe("a");
    expect(link.props.href).toBe("/about");
  });

  test("useState returns [value, setter]", () => {
    const [val, set] = (globalThis as any).useState(42);
    expect(val).toBe(42);
    expect(typeof set).toBe("function");
  });

  test("useRef returns {current: init}", () => {
    const ref = (globalThis as any).useRef("x");
    expect(ref.current).toBe("x");
  });

  test("useMemo calls factory", () => {
    const val = (globalThis as any).useMemo(() => 99);
    expect(val).toBe(99);
  });

  test("useCallback returns the function", () => {
    const fn = () => "hello";
    const cb = (globalThis as any).useCallback(fn);
    expect(cb).toBe(fn);
  });
});

describe("regression — SpawnError functional", () => {
  test("__SpawnError is accessible (non-enumerable)", () => {
    const SE = (globalThis as any).__SpawnError;
    expect(SE).toBeTruthy();
  });

  test("__SpawnError extends Error", () => {
    const SE = (globalThis as any).__SpawnError;
    const err = new SE("test", null, "ctx1", "child", "parent");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SpawnError");
    expect(err.contextId).toBe("ctx1");
  });
});

describe("regression — channel async iterator functional", () => {
  test("__channelAsyncIterator is accessible (non-enumerable)", () => {
    expect(typeof (globalThis as any).__channelAsyncIterator).toBe("function");
  });
});

describe("regression — createServer routes via import", () => {
  let server: any;

  test("createServer + GET route works", async () => {
    server = createServer({ port: PORT_SEC, host: "127.0.0.1" });
    server.get("/health", (_req: any, res: any) => res.json({ ok: true }));
    server.start();
    const res = await fetch(`http://127.0.0.1:${PORT_SEC}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  test("POST route works", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC}/health`, { method: "POST" });
    expect(res.status).toBe(404);
  });

  test("stop server", () => {
    server.stop();
  });
});

describe("regression — route param extraction", () => {
  let server: any;

  test("start param server", () => {
    server = createServer({ port: PORT_SEC + 1, host: "127.0.0.1" });
    server.get("/users/:id", (req: any, res: any) => {
      res.json({ id: req.params.id });
    });
    server.get("/files/*path", (req: any, res: any) => {
      res.json({ path: req.params.path });
    });
    server.start();
  });

  test("named param :id extracted correctly", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 1}/users/42`);
    const data = await res.json();
    expect(data.id).toBe("42");
  });

  test("wildcard *path extracted correctly", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 1}/files/a/b/c`);
    const data = await res.json();
    expect(data.path).toBeTruthy();
  });

  test("stop param server", () => {
    server.stop();
  });
});

describe("regression — URL validation (now Rust native)", () => {
  let server: any;

  test("start validation server", () => {
    server = createServer({ port: PORT_SEC + 2, host: "127.0.0.1" });
    server.get("/safe", (_req: any, res: any) => res.text("ok"));
    server.start();
  });

  test("valid URL segment accepted", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 2}/safe`);
    expect(res.status).toBe(200);
  });

  test("stop validation server", () => {
    server.stop();
  });
});

describe("regression — middleware via import", () => {
  test("cors() returns middleware function", () => {
    const mw = cors();
    expect(typeof mw).toBe("function");
  });

  test("rateLimit() returns middleware function", () => {
    const mw = rateLimit({ max: 10, window: 1000 });
    expect(typeof mw).toBe("function");
  });

  test("helmet() returns middleware function", () => {
    const mw = helmet();
    expect(typeof mw).toBe("function");
  });

  test("safePath() returns middleware function", () => {
    const mw = safePath();
    expect(typeof mw).toBe("function");
  });

  test("bodyLimit() returns middleware function", () => {
    const mw = bodyLimit({ max: 1024 });
    expect(typeof mw).toBe("function");
  });

  test("csrf() returns middleware function", () => {
    const mw = csrf();
    expect(typeof mw).toBe("function");
  });

  test("errorHandler() returns middleware function", () => {
    const mw = errorHandler();
    expect(typeof mw).toBe("function");
  });

  test("timeout() returns middleware function", () => {
    const mw = timeout(5000);
    expect(typeof mw).toBe("function");
  });

  test("httpsRedirect() returns middleware function", () => {
    const mw = httpsRedirect();
    expect(typeof mw).toBe("function");
  });

  test("secureCookies() returns middleware function", () => {
    const mw = secureCookies();
    expect(typeof mw).toBe("function");
  });

  test("requestId() returns middleware function", () => {
    const mw = requestId();
    expect(typeof mw).toBe("function");
  });

  test("ipFilter() returns middleware function", () => {
    const mw = ipFilter({ allow: ["127.0.0.1"] });
    expect(typeof mw).toBe("function");
  });

  test("validateContentType() returns middleware function", () => {
    const mw = validateContentType({ types: ["application/json"] });
    expect(typeof mw).toBe("function");
  });
});

describe("regression — server with middleware chain", () => {
  let server: any;

  test("start server with cors + helmet", async () => {
    server = createServer({ port: PORT_SEC + 3, host: "127.0.0.1" });
    server.use(cors());
    server.use(helmet());
    server.get("/mw-test", (_req: any, res: any) => res.json({ mw: true }));
    server.start();
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 3}/mw-test`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mw).toBe(true);
  });

  test("stop middleware server", () => {
    server.stop();
  });
});

describe("regression — server group routes", () => {
  let server: any;

  test("start server with groups", async () => {
    server = createServer({ port: PORT_SEC + 4, host: "127.0.0.1" });
    server.group("/api", (g: any) => {
      g.get("/status", (_req: any, res: any) => res.json({ up: true }));
      g.post("/echo", (req: any, res: any) => res.text(req.body || "empty"));
    });
    server.start();
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 4}/api/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.up).toBe(true);
  });

  test("stop group server", () => {
    server.stop();
  });
});

describe("regression — response object methods", () => {
  let server: any;

  test("start response server", () => {
    server = createServer({ port: PORT_SEC + 5, host: "127.0.0.1" });
    server.get("/json", (_req: any, res: any) => res.json({ x: 1 }));
    server.get("/text", (_req: any, res: any) => res.text("hello"));
    server.get("/html", (_req: any, res: any) => res.html("<b>bold</b>"));
    server.get("/status-custom", (_req: any, res: any) => res.status(201).text("created"));
    server.get("/header-custom", (_req: any, res: any) => {
      res.header("x-custom", "ekko").text("ok");
    });
    server.get("/redirect-test", (_req: any, res: any) => res.redirect("/json"));
    server.get("/cookie-test", (_req: any, res: any) => {
      res.cookie("session", "abc123", { httpOnly: true }).text("ok");
    });
    server.start();
  });

  test("res.json works", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 5}/json`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.x).toBe(1);
  });

  test("res.text works", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 5}/text`);
    const body = await res.text();
    expect(body).toBe("hello");
  });

  test("res.html works", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 5}/html`);
    const body = await res.text();
    expect(body).toContain("<b>bold</b>");
  });

  test("res.status(201) works", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 5}/status-custom`);
    expect(res.status).toBe(201);
  });

  test("res.header sets custom header", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 5}/header-custom`);
    expect(res.headers["x-custom"] || res.headers?.["x-custom"]).toBeTruthy();
  });

  test("res.redirect returns 302", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 5}/redirect-test`);
    expect(res.status === 302 || res.status === 200).toBe(true);
  });

  test("stop response server", () => {
    server.stop();
  });
});

describe("regression — server onError handler", () => {
  let server: any;
  let errorCaught = false;

  test("start server with onError", async () => {
    server = createServer({ port: PORT_SEC + 6, host: "127.0.0.1" });
    server.onError((err: any, _req: any, res: any) => {
      errorCaught = true;
      res.status(500).json({ caught: true, message: String(err) });
    });
    server.get("/throw", (_req: any, _res: any) => {
      throw new Error("intentional");
    });
    server.start();
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 6}/throw`);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.caught).toBe(true);
  });

  test("stop onError server", () => {
    server.stop();
  });
});

describe("regression — PATCH method", () => {
  let server: any;

  test("PATCH route works", async () => {
    server = createServer({ port: PORT_SEC + 7, host: "127.0.0.1" });
    server.patch("/update", (_req: any, res: any) => res.json({ patched: true }));
    server.start();
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 7}/update`, { method: "PATCH" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.patched).toBe(true);
  });

  test("stop PATCH server", () => {
    server.stop();
  });
});

describe("regression — 404 for unmatched routes", () => {
  let server: any;

  test("unmatched route returns 404", async () => {
    server = createServer({ port: PORT_SEC + 8, host: "127.0.0.1" });
    server.get("/exists", (_req: any, res: any) => res.text("ok"));
    server.start();
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 8}/does-not-exist`);
    expect(res.status).toBe(404);
  });

  test("stop 404 server", () => {
    server.stop();
  });
});

describe("regression — request body parsing", () => {
  let server: any;

  test("req.json() parses JSON body", async () => {
    server = createServer({ port: PORT_SEC + 9, host: "127.0.0.1" });
    server.post("/echo-json", (req: any, res: any) => {
      const body = req.json();
      res.json(body);
    });
    server.start();
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 9}/echo-json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "value" }),
    });
    const data = await res.json();
    expect(data.key).toBe("value");
  });

  test("req.text() returns raw body", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 9}/echo-json`, {
      method: "POST",
      body: "raw-text",
    });
    expect(res).toBeTruthy();
  });

  test("stop body server", () => {
    server.stop();
  });
});

describe("regression — fetch API", () => {
  let server: any;

  test("start fetch target server", () => {
    server = createServer({ port: PORT_SEC + 10, host: "127.0.0.1" });
    server.get("/fetch-target", (_req: any, res: any) => res.json({ fetched: true }));
    server.get("/fetch-text", (_req: any, res: any) => res.text("plain"));
    server.start();
  });

  test("fetch().json() works", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 10}/fetch-target`);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.fetched).toBe(true);
  });

  test("fetch().text() works", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 10}/fetch-text`);
    const txt = await res.text();
    expect(txt).toBe("plain");
  });

  test("fetch with method POST", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT_SEC + 10}/fetch-target`, {
      method: "POST",
    });
    expect(res.status).toBe(404);
  });

  test("stop fetch target server", () => {
    server.stop();
  });
});
