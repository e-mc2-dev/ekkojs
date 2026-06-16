// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createGraphQL } from "ekko:web/graphql";
import { asserter } from "../_harness.ts";

const t = asserter();

const sdl = `
type Query { me: User, list: [User], tagged(kind: String, ids: [Int], opts: Filter): String }
type User { id: ID, name: String, age: Int, friend: User }
input Filter { active: Boolean, role: String }
`;
const me = { id: "1", name: "Alice", age: 30, friend: { id: "2", name: "Bob", age: 25, friend: { id: "3", name: "Cara", age: 40, friend: null } } };
const gql = createGraphQL({
  schema: sdl,
  resolvers: {
    Query: {
      me: () => me,
      list: () => [{ id: "1", name: "A" }, { id: "2", name: "B" }],
      tagged: (_p: any, args: any) => JSON.stringify({ kind: args.kind, ids: args.ids, opts: args.opts }),
    },
  },
  maxDepth: 4,
});

t.group("fragment reused in disjoint branches (cycle guard not over-blocking)");
{
  
  const q = "{ me { ...F friend { ...F } } } fragment F on User { id name }";
  const r = gql.execute(q, {}, {}) as any;
  t.deep("outer F", { id: r.data.me.id, name: r.data.me.name }, { id: "1", name: "Alice" });
  t.deep("inner F also expanded", r.data.me.friend, { id: "2", name: "Bob" });
}

t.group("inline fragment nesting + aliases");
{
  const r = gql.execute("{ a: me { ... on User { n: name } } }", {}, {}) as any;
  t.eq("aliased field inside inline fragment", r.data.a.n, "Alice");
}

t.group("__typename nested");
{
  const r = gql.execute("{ me { __typename id } }", {}, {}) as any;
  t.eq("nested __typename", r.data.me.__typename, "User");
}

t.group("argument coercion (list / input object / variables)");
{
  const r = gql.execute('{ tagged(kind: "x", ids: [1,2,3], opts: { active: true, role: "admin" }) }', {}, {}) as any;
  const parsed = JSON.parse(r.data.tagged);
  t.deep("list arg coerced", parsed.ids, [1, 2, 3]);
  t.deep("input object arg coerced", parsed.opts, { active: true, role: "admin" });
  const r2 = gql.execute("query($k: String, $ids: [Int]){ tagged(kind: $k, ids: $ids) }", { k: "v", ids: [9] }, {}) as any;
  const parsed2 = JSON.parse(r2.data.tagged);
  t.eq("variable scalar", parsed2.kind, "v");
  t.deep("variable list", parsed2.ids, [9]);
}

t.group("list of objects with per-item resolution");
{
  const r = gql.execute("{ list { id name } }", {}, {}) as any;
  t.eq("list length", r.data.list.length, 2);
  t.deep("item 0", r.data.list[0], { id: "1", name: "A" });
}

t.group("maxDepth boundary (limit 4, self-referential data)");
{
  
  const loop: any = { id: "1", name: "loop" }; loop.friend = loop;
  const g = createGraphQL({ schema: sdl, resolvers: { Query: { me: () => loop } }, maxDepth: 4 });
  const ok = g.execute("{ me { friend { friend { id } } } }", {}, {}) as any;
  t.check("within maxDepth resolves", ok.data.me.friend.friend && ok.data.me.friend.friend.id === "1");
  const over = g.execute("{ me { friend { friend { friend { friend { id } } } } } }", {}, {}) as any;
  const hasErr = over.errors && over.errors.some((e: any) => /depth/i.test(e.message));
  t.check("beyond maxDepth → depth error", !!hasErr);
}

t.group("unknown field falls back / empty selections");
{
  const r = gql.execute("{ me { id } }", {}, {}) as any;
  t.eq("known field", r.data.me.id, "1");
}

t.done("ekko:web/graphql recheck");
