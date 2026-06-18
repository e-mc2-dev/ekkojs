// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import {
  createRouter, matchPath, extractParams, validateUrl,
  useRouter, useParams, useSearchParams, navigate, Link,
} from "ekko:rune/router";
import { asserter } from "../_harness";

const t = asserter();

t.group("matchPath — literal / param / catchall");
t.check("exact match", matchPath("/users", "/users"));
t.check("root match", matchPath("/", "/"));
t.check(":param matches a segment", matchPath("/users/:id", "/users/42"));
t.check("{param} matches a segment", matchPath("/users/{id}", "/users/42"));
t.check("*catchall matches the rest", matchPath("/files/*path", "/files/a/b/c"));
t.check("*catchall matches one trailing segment", matchPath("/files/*path", "/files/a"));
t.check("mixed literal+param+catchall", matchPath("/u/:id/files/*p", "/u/7/files/a/b"));
t.check("literal mismatch → false", !matchPath("/a", "/b"));
t.check("too few actual segments → false", !matchPath("/a/b", "/a"));
t.check("too many actual segments → false", !matchPath("/a", "/a/b"));
t.check("param then literal mismatch → false", !matchPath("/u/:id/edit", "/u/7/view"));
t.check("trailing-slash normalized (split filter)", matchPath("/users/", "/users"));

t.group("extractParams — :param / {param} / *catchall");
t.deep("single :param", extractParams("/users/:id", "/users/42"), { id: "42" });
t.deep("single {param}", extractParams("/u/{id}", "/u/7"), { id: "7" });
t.deep("multi :param", extractParams("/u/:uid/p/:pid", "/u/1/p/2"), { uid: "1", pid: "2" });
t.deep("mixed : and {}", extractParams("/u/:uid/{pid}", "/u/1/2"), { uid: "1", pid: "2" });
t.deep("*catchall → array of segments", extractParams("/files/*path", "/files/a/b/c"), { path: ["a", "b", "c"] });
t.deep("*catchall single segment → array", extractParams("/files/*path", "/files/a"), { path: ["a"] });
t.deep("no-param pattern → {}", extractParams("/about", "/about"), {});

t.group("validateUrl — accepts clean URLs");
t.check("simple path", validateUrl("/users/42"));
t.check("root path", validateUrl("/"));
t.check("path with - and _", validateUrl("/user-list/my_item"));
t.check("query k=v", validateUrl("/search?q=hello"));
t.check("multi-pair query", validateUrl("/search?q=hello&page=2"));
t.check("alphanumeric segments", validateUrl("/v1/api/Users42"));

t.group("createRouter — match");
{
  const r = createRouter({ routes: [{ path: "/users/:id", page: "user" }, { path: "/about", page: "about" }] });
  t.eq("match returns the route page", (r.match("/users/42") as any).page, "user");
  t.eq("match second route", (r.match("/about") as any).page, "about");
  t.eq("match honors query (path only)", (r.match("/users/42?tab=info") as any).page, "user");
  t.eq("no-match → null", r.match("/nope") as any, null);
  t.eq("first matching route wins", (r.match("/users/9") as any).path, "/users/:id");
}

t.group("createRouter — resolve (params + query)");
{
  const r = createRouter({ routes: [{ path: "/users/:id", page: "user" }] });
  const res = r.resolve("/users/42?tab=info&x=1") as any;
  t.eq("resolve route page", res.route.page, "user");
  t.deep("resolve params", res.params, { id: "42" });
  t.deep("resolve query", res.query, { tab: "info", x: "1" });
  t.eq("resolve no-match → null", r.resolve("/nope") as any, null);
}

t.group("createRouter — guards");
{
  const r = createRouter({ routes: [{ path: "/admin", page: "a", guard: { check: () => false, redirect: "/login" } }] });
  const res = r.resolve("/admin") as any;
  t.check("guard.check false → guarded", res.guarded === true);
  t.eq("guard redirect target", res.redirect, "/login");
}
{
  const r = createRouter({ routes: [{ path: "/admin", page: "a", guard: () => "/login2" }] });
  t.eq("function guard returning string → redirect", (r.resolve("/admin") as any).redirect, "/login2");
}
{
  const r = createRouter({ routes: [{ path: "/ok", page: "o", guard: () => true }] });
  const res = r.resolve("/ok") as any;
  t.eq("guard true → resolves normally", res.route.page, "o");
  t.check("guard true → not guarded", res.guarded === undefined);
}

t.group("createRouter — toManifest / toClientConfig");
{
  const r = createRouter({
    routes: [{ path: "/a", page: "pa" }, { path: "/admin", page: "pad", guard: { check: () => false, redirect: "/login" } }],
    backRules: [{ match: "/list", goTo: "/home" }, { match: /^\/x/, goTo: "/y" }, { match: () => true, skip: true }],
    beforeUnload: ["/checkout"],
  });
  const m = r.toManifest();
  t.eq("manifest length", m.length, 2);
  t.deep("manifest entry 0", m[0], { pattern: "/a", page: "pa", guard: null });
  t.deep("manifest entry 1 carries guard redirect", (m[1] as any).guard, { redirect: "/login" });
  const cc = r.toClientConfig() as any;
  t.eq("clientConfig string backRule mapped", cc.backRules[0].matchType, "string");
  t.eq("clientConfig regex backRule mapped", cc.backRules[1].matchType, "regex");
  t.eq("clientConfig regex source captured", cc.backRules[1].match, "^\\/x");
  t.eq("clientConfig function backRule → skip", cc.backRules[2].matchType, "skip");
  t.deep("clientConfig beforeUnload passthrough", cc.beforeUnload, ["/checkout"]);
}

t.group("client stubs callable / inert (server-side)");
t.notThrows("useRouter() does not throw", () => useRouter());
t.deep("useParams() → {}", useParams(), {});
t.deep("useSearchParams() → {}", useSearchParams(), {});
t.notThrows("navigate() no-op does not throw", () => navigate());
{
  const rr = useRouter() as any;
  t.eq("useRouter default path", rr.path, "/");
  t.deep("useRouter default params", rr.params, {});
  t.notThrows("useRouter().navigate() inert", () => rr.navigate());
}

t.group("Link — first-class export (task 305: replaced the window.Link/globalThis.Link ambient globals)");
t.type("Link is exported from ekko:rune/router", Link, "function");
{
  
  const el = Link({ href: "/docs", children: "Docs", className: "nav" }) as any;
  t.ok("Link(...) returns an element", el);
  t.eq("Link renders an <a>", el.type, "a");
  t.eq("Link forwards href", el.props.href, "/docs");
  t.eq("Link sets data-nav (client-nav hook)", el.props["data-nav"], "");
  t.eq("Link sets data-ekko-prefetch default true", el.props["data-ekko-prefetch"], "true");
  t.eq("Link forwards className", el.props.className, "nav");
  t.eq("Link forwards children", el.props.children, "Docs");
  const el2 = Link({ to: "/x", prefetch: false }) as any;
  t.eq("Link accepts `to` alias", el2.props.href, "/x");
  t.eq("Link prefetch:false disables prefetch", el2.props["data-ekko-prefetch"], "false");
}

t.eq("no globalThis.Link ambient global", typeof (globalThis as any).Link, "undefined");

t.done("ekko:rune/router covered");
