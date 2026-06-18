// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createRouter, matchPath, extractParams, validateUrl } from "ekko:rune/router";
import { asserter } from "../_harness";

const t = asserter();

t.group("validateUrl whitelist strictness (contract: only [A-Za-z0-9_-] per segment)");

t.check("dotted filename rejected", !validateUrl("/posts/2024.html"));
t.check("percent-encoding rejected", !validateUrl("/caf%C3%A9"));
t.check("tilde rejected", !validateUrl("/~user"));
t.check("plus rejected", !validateUrl("/a+b"));
t.check("unicode segment rejected", !validateUrl("/café"));
t.check("dot-segment rejected", !validateUrl("/a.b.c"));
t.check("empty segment collapse still valid (// → filtered)", validateUrl("/a//b"));
t.check("equals in path segment rejected", !validateUrl("/a=b"));

t.group("matchPath boundary cases");
t.check("catchall with zero trailing segments → false", !matchPath("/files/*p", "/files"));
t.check("catchall is at-least-one (i+1)", matchPath("/files/*p", "/files/x"));
t.check(":param at first position", matchPath("/:id", "/42"));
t.check("pattern longer than actual → false", !matchPath("/a/b/c", "/a/b"));
t.check("actual longer, no catchall → false", !matchPath("/a/:b", "/a/b/c"));
t.check("all-literal exact-length match", matchPath("/a/b/c", "/a/b/c"));
t.check("empty pattern vs empty actual (root)", matchPath("/", "/"));
t.check("param matches but trailing literal differs", !matchPath("/u/:id/x", "/u/1/y"));

t.group("extractParams edge cases");
t.deep("catchall over many segments", extractParams("/f/*rest", "/f/a/b/c/d"), { rest: ["a", "b", "c", "d"] });
t.deep("catchall short-circuits remaining params", extractParams("/f/*rest/:x", "/f/a/b"), { rest: ["a", "b"] });
t.deep("param value preserves allowed chars", extractParams("/u/:id", "/u/a-b_c"), { id: "a-b_c" });
t.deep("missing actual segment → empty string", extractParams("/u/:id/:x", "/u/1"), { id: "1", x: "" });
t.deep("brace and colon mixed extraction", extractParams("/a/{x}/b/:y", "/a/1/b/2"), { x: "1", y: "2" });

t.group("query parsing edges (resolve)");
{
  const r = createRouter({ routes: [{ path: "/s", page: "s" }] });
  t.deep("repeated key → last wins", (r.resolve("/s?a=1&a=2") as any).query, { a: "2" });
  t.deep("empty value preserved", (r.resolve("/s?a=") as any).query, { a: "" });
  t.deep("no query → empty object", (r.resolve("/s") as any).query, {});
  
  t.eq("valueless pair rejected upstream", (r.resolve("/s?a") as any).error, "invalid_url");
}

t.group("route ordering / priority");
{
  const r = createRouter({ routes: [{ path: "/u/:id", page: "dyn" }, { path: "/u/me", page: "static" }] });
  
  t.eq("first-registered route wins", (r.match("/u/me") as any).page, "dyn");
}
{
  const r = createRouter({ routes: [{ path: "/u/me", page: "static" }, { path: "/u/:id", page: "dyn" }] });
  t.eq("reorder → static wins when first", (r.match("/u/me") as any).page, "static");
  t.eq("dynamic still reachable", (r.match("/u/42") as any).page, "dyn");
}

t.group("createRouter edge configs");
t.notThrows("empty routes config", () => createRouter({}));
t.eq("empty router match → null", createRouter({}).match("/anything") as any, null);
{
  const r = createRouter({ routes: [{ path: "/a/b/c/d/e/:id", page: "deep" }] });
  t.eq("deeply nested route resolves", (r.resolve("/a/b/c/d/e/9") as any).route.page, "deep");
  t.deep("deeply nested params", (r.resolve("/a/b/c/d/e/9") as any).params, { id: "9" });
}
{
  
  const r = createRouter({ routes: [{ path: "/x", page: "x", guard: { redirect: "/login" } as any }] });
  t.eq("guard object without check → resolves", (r.resolve("/x") as any).route.page, "x");
}
{
  
  const r = createRouter({ routes: [{ path: "/y", page: "y", guard: () => undefined as any }] });
  t.eq("guard returning undefined → resolves", (r.resolve("/y") as any).route.page, "y");
}

t.done("ekko:rune/router recheck");
