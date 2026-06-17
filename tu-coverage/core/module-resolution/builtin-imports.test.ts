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
import * as fs from "ekko:fs";
import * as path from "ekko:fs/path";
import * as encoding from "ekko:text/encoding";
import * as compress from "ekko:compress";
import * as json from "ekko:text/json";
import * as regex from "ekko:text/regex";
import * as crypto from "ekko:crypto";
import * as datetime from "ekko:datetime";
import * as db from "ekko:db";
import * as process from "ekko:process";
import * as net from "ekko:net";
import * as web from "ekko:web";
import * as assert from "ekko:test/assert";
import * as log from "ekko:log";
import * as testModule from "ekko:test";

describe("builtin imports - ekko:fs", () => {
  test("fs module is importable and has readText", () => {
    expect(typeof fs).toBe("object");
    expect(typeof fs.readText).toBe("function");
  });
});

describe("builtin imports - ekko:path", () => {
  test("path module is importable and has join", () => {
    expect(typeof path).toBe("object");
    expect(typeof path.join).toBe("function");
  });
});

describe("builtin imports - ekko:encoding", () => {
  test("encoding module is importable", () => {
    expect(typeof encoding).toBe("object");
  });
});

describe("builtin imports - ekko:compress", () => {
  test("compress module is importable", () => {
    expect(typeof compress).toBe("object");
  });
});

describe("builtin imports - ekko:json", () => {
  test("json module is importable and has json.parse", () => {
    expect(typeof json).toBe("object");
    expect(typeof json.json).toBe("object");
    expect(typeof json.json.parse).toBe("function");
  });
});

describe("builtin imports - ekko:regex", () => {
  test("regex module is importable", () => {
    expect(typeof regex).toBe("object");
  });
});

describe("builtin imports - ekko:crypto", () => {
  test("crypto module is importable and has hash", () => {
    expect(typeof crypto).toBe("object");
    expect(typeof crypto.hash).toBe("function");
  });
});

describe("builtin imports - ekko:datetime", () => {
  test("datetime module is importable and has datetime.now", () => {
    expect(typeof datetime).toBe("object");
    expect(typeof datetime.datetime).toBe("object");
    expect(typeof datetime.datetime.now).toBe("function");
  });
});

describe("builtin imports - ekko:db", () => {
  test("db module is importable", () => {
    expect(typeof db).toBe("object");
  });
});

describe("builtin imports - ekko:process", () => {
  test("process module is importable and has exec", () => {
    expect(typeof process).toBe("object");
    expect(typeof process.exec).toBe("function");
  });
});

describe("builtin imports - ekko:net", () => {
  test("net module is importable", () => {
    expect(typeof net).toBe("object");
  });
});

describe("builtin imports - ekko:web", () => {
  test("web module is importable", () => {
    expect(typeof web).toBe("object");
  });
});

describe("builtin imports - ekko:assert", () => {
  test("assert module is importable", () => {
    expect(typeof assert).toBe("object");
  });
});

describe("builtin imports - ekko:log", () => {
  test("log module is importable", () => {
    expect(typeof log).toBe("object");
  });
});

describe("builtin imports - ekko:test", () => {
  test("test module exports describe, test, and expect", () => {
    expect(typeof testModule.describe).toBe("function");
    expect(typeof testModule.test).toBe("function");
    expect(typeof testModule.expect).toBe("function");
  });
});
