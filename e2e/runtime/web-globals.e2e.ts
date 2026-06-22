// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { asserter } from "../_harness";

const t = asserter();

t.group("URLSearchParams — globally available");
t.type("URLSearchParams is a constructor", URLSearchParams, "function");
t.notThrows("new URLSearchParams(query) does not throw", () => new URLSearchParams("?a=1"));

t.group("URLSearchParams — parsing & accessors");
const q = new URLSearchParams("?name=Ada&tag=a&tag=b&q=hello+world&enc=%2Fpath&blank=");
t.eq("get", q.get("name"), "Ada");
t.deep("getAll (repeated key)", q.getAll("tag"), ["a", "b"]);
t.eq("+ decodes to space", q.get("q"), "hello world");
t.eq("%2F decodes", q.get("enc"), "/path");
t.eq("empty value", q.get("blank"), "");
t.eq("missing key → null", q.get("nope"), null);
t.check("has true/false", q.has("name") && !q.has("nope"));
t.eq("size", (q as any).size, 6);
t.eq("leading ? optional", new URLSearchParams("a=1").get("a"), "1");
t.eq("key with no =", new URLSearchParams("flag").get("flag"), "");

t.group("URLSearchParams — mutation");
const m = new URLSearchParams("a=1&a=2&b=3");
m.append("c", "4"); m.set("a", "9"); (m as any).delete("b");
t.eq("set replaces first, drops rest", m.getAll("a").join(","), "9");
t.eq("append adds", m.get("c"), "4");
t.eq("delete removes all", m.getAll("b").length, 0);

t.group("URLSearchParams — toString & inputs");
t.eq("toString +-encodes spaces", new URLSearchParams("a=hi there").toString(), "a=hi+there");
t.eq("toString encodes reserved", new URLSearchParams([["x", "a/b"]] as any).toString(), "x=a%2Fb");
t.eq("from object", new URLSearchParams({ a: "1", b: "2" } as any).toString(), "a=1&b=2");
t.eq("from pairs array", new URLSearchParams([["k", "v"], ["k", "w"]] as any).getAll("k").join(","), "v,w");
t.eq("copy ctor", new URLSearchParams(new URLSearchParams("z=1")).get("z"), "1");
{
  let it = ""; for (const [k, v] of new URLSearchParams("p=1&q=2")) it += k + v;
  t.eq("iterable entries", it, "p1q2");
}

t.group("URL — globally available & parsing");
t.type("URL is a constructor", URL, "function");
const u = new URL("https://user:pw@example.com:8443/path/to?x=1&y=2#frag");
t.eq("protocol", u.protocol, "https:");
t.eq("username", u.username, "user");
t.eq("password", u.password, "pw");
t.eq("hostname", u.hostname, "example.com");
t.eq("port", u.port, "8443");
t.eq("host", (u as any).host, "example.com:8443");
t.eq("pathname", u.pathname, "/path/to");
t.eq("search", (u as any).search, "?x=1&y=2");
t.eq("searchParams.get", u.searchParams.get("y"), "2");
t.eq("hash", u.hash, "#frag");
t.eq("origin (special scheme)", (u as any).origin, "https://example.com:8443");
t.eq("href roundtrip", (u as any).href, "https://user:pw@example.com:8443/path/to?x=1&y=2#frag");
t.eq("toString === href", u.toString(), (u as any).href);

t.group("URL — edge cases");
t.eq("no port → host is hostname", (new URL("http://h.com/a") as any).host, "h.com");
t.eq("default pathname", new URL("https://h.com").pathname, "/");
t.eq("relative resolves against base", (new URL("/api/items?id=5", "https://h.com/base/") as any).href, "https://h.com/api/items?id=5");
t.eq("relative path segment", (new URL("next", "https://h.com/a/b") as any).href, "https://h.com/a/next");
t.eq("non-special scheme origin is null", (new URL("mailto:a@b.com") as any).origin, "null");
t.throws("invalid URL throws", () => { new URL("not a url"); }, /Invalid URL/);

t.done("web globals — URLSearchParams + URL (server-side)");
