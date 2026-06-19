// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createRouter, validateUrl, matchPath } from "ekko:rune/router";
import { asserter } from "../_harness";

const t = asserter();

t.group("validateUrl — rejects path traversal");
t.check("dot-dot ..", !validateUrl("/users/../admin"));
t.check("leading ../", !validateUrl("../etc/passwd"));
t.check("encoded %2e%2e", !validateUrl("/users/%2e%2e"));
t.check("encoded slash %2f", !validateUrl("/users%2fadmin"));
t.check("backslash traversal", !validateUrl("/users/..\\admin"));
t.check("bare dot segment", !validateUrl("/./admin"));
t.check("absolute traversal mix", !validateUrl("/a/../../b"));

t.group("validateUrl — rejects injection / unsafe chars");
t.check("<script> tag", !validateUrl("/<script>"));
t.check("angle brackets", !validateUrl("/a<b>"));
t.check("double quote", !validateUrl('/a"b'));
t.check("single quote", !validateUrl("/a'b"));
t.check("space", !validateUrl("/a b"));
t.check("semicolon", !validateUrl("/a;b"));
t.check("null byte", !validateUrl(("/a"+String.fromCharCode(0)+"b")));
t.check("newline", !validateUrl("/a\nb"));
t.check("percent-encoded", !validateUrl("/a%20b"));
t.check("at-sign / colon (authority spoof)", !validateUrl("/a@evil:b"));
t.check("dot in segment (filename)", !validateUrl("/file.json"));

t.group("validateUrl — rejects malformed query");
t.check("double ampersand", !validateUrl("/x?a=1&&b=2"));
t.check("leading ampersand", !validateUrl("/x?&a=1"));
t.check("trailing ampersand", !validateUrl("/x?a=1&"));
t.check("missing = in pair", !validateUrl("/x?a"));
t.check("unsafe query key", !validateUrl("/x?a<b=1"));
t.check("unsafe query value", !validateUrl("/x?a=<b>"));
t.check("injection in query value", !validateUrl("/x?q='; DROP TABLE"));

t.group("validateUrl — accepts only the clean whitelist");
t.check("clean path accepted", validateUrl("/users/42"));
t.check("dash/underscore accepted", validateUrl("/a-b/c_d"));
t.check("clean query accepted", validateUrl("/s?q=hi&p=2"));
t.check("root accepted", validateUrl("/"));

t.group("malicious URL never reaches a route handler");
{
  const r = createRouter({ routes: [{ path: "/admin", page: "a" }, { path: "/users/:id", page: "u" }] });
  t.eq("traversal → match null", r.match("/users/../admin") as any, null);
  t.eq("traversal → resolve invalid_url", (r.resolve("/users/../admin") as any).error, "invalid_url");
  t.eq("xss segment → match null", r.match("/<script>") as any, null);
  t.eq("xss → resolve invalid_url", (r.resolve("/<script>") as any).error, "invalid_url");
  t.eq("encoded traversal → match null", r.match("/users/%2e%2e") as any, null);
  t.eq("null byte → resolve invalid_url", (r.resolve(("/a"+String.fromCharCode(0)+"b")) as any).error, "invalid_url");
  t.eq("query injection → resolve invalid_url", (r.resolve("/users/1?x=<b>") as any).error, "invalid_url");
  
  t.eq("malicious :id segment rejected", r.match("/users/<x>") as any, null);
}

t.group("createRouter — rejects unsafe literal route segments at construction");
t.throws("unsafe literal route throws", () => createRouter({ routes: [{ path: "/<bad>", page: "x" }] }), /Invalid route segment/);
t.throws("traversal literal route throws", () => createRouter({ routes: [{ path: "/a/../b", page: "x" }] }), /Invalid route segment/);
t.notThrows(":param route allowed", () => createRouter({ routes: [{ path: "/u/:id", page: "x" }] }));
t.notThrows("*catchall route allowed", () => createRouter({ routes: [{ path: "/f/*p", page: "x" }] }));

t.group("matchPath has no regex-DoS surface (split/charAt only)");
{
  const long = "/" + "a/".repeat(5000) + "b";
  t.notThrows("very long path matches in linear time", () => matchPath("/x", long));
  t.notThrows("very long catchall in linear time", () => matchPath("/*p", long));
}

t.done("ekko:rune/router cybersec");
