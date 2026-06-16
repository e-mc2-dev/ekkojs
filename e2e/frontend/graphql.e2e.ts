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
type Query { me: User, users: [User], num: Int, greet(name: String): String }
type Mutation { setAge(age: Int): User }
type User { id: ID, name: String, age: Int, friend: User }
`;
const data = { id: "1", name: "Alice", age: 30, friend: { id: "2", name: "Bob", age: 25, friend: null } };
const gql = createGraphQL({
  schema: sdl,
  resolvers: {
    Query: {
      me: () => data,
      users: () => [{ id: "1", name: "Alice" }, { id: "2", name: "Bob" }],
      num: () => 42,
      greet: (_p: any, args: any) => "Hi " + args.name,
    },
    Mutation: { setAge: (_p: any, args: any) => ({ id: "1", name: "Alice", age: args.age }) },
  },
  maxDepth: 8,
});

t.group("basic query + resolver");
{
  const r = gql.execute("{ me { id name } }", {}, {}) as any;
  t.deep("simple fields", r.data.me, { id: "1", name: "Alice" });
  t.check("no errors", !r.errors);
}
t.group("aliases + scalar resolvers");
{
  const r = gql.execute("{ first: num }", {}, {}) as any;
  t.eq("alias on scalar", r.data.first, 42);
}
t.group("arguments (string literal + variable)");
{
  const r = gql.execute('{ greet(name: "World") }', {}, {}) as any;
  t.eq("string arg", r.data.greet, "Hi World");
  const r2 = gql.execute("query($n: String){ greet(name: $n) }", { n: "Var" }, {}) as any;
  t.eq("variable arg", r2.data.greet, "Hi Var");
}
t.group("nested object resolution");
{
  const r = gql.execute("{ me { name friend { name } } }", {}, {}) as any;
  t.deep("nested friend", r.data.me, { name: "Alice", friend: { name: "Bob" } });
}
t.group("list resolution");
{
  const r = gql.execute("{ users { id name } }", {}, {}) as any;
  t.eq("list length", r.data.users.length, 2);
  t.deep("list item", r.data.users[1], { id: "2", name: "Bob" });
}
t.group("mutation root");
{
  const r = gql.execute("mutation { setAge(age: 99) { age } }", {}, {}) as any;
  t.eq("mutation result", r.data.setAge.age, 99);
}
t.group("introspection");
{
  const r = gql.execute("{ __schema { queryType { name } } }", {}, {}) as any;
  t.eq("queryType name", r.data.__schema.queryType.name, "Query");
  const r2 = gql.execute('{ __type(name: "User") { name kind } }', {}, {}) as any;
  t.eq("__type name", r2.data.__type.name, "User");
  t.eq("__type kind", r2.data.__type.kind, "OBJECT");
  const r3 = gql.execute("{ __typename }", {}, {}) as any;
  t.eq("__typename at root", r3.data.__typename, "Query");
}
t.group("valid fragments");
{
  const r = gql.execute("{ me { ...F } } fragment F on User { id name }", {}, {}) as any;
  t.deep("fragment spread expands", r.data.me, { id: "1", name: "Alice" });
  const r2 = gql.execute("{ me { ... on User { name } } }", {}, {}) as any;
  t.deep("inline fragment expands", r2.data.me, { name: "Alice" });
}
t.group("resolver errors → partial data + errors");
{
  const g2 = createGraphQL({ schema: sdl, resolvers: { Query: { me: () => { throw new Error("boom"); } } } });
  const r = g2.execute("{ me { id } }", {}, {}) as any;
  t.check("errors present", Array.isArray(r.errors) && r.errors.length > 0);
  t.check("error message captured", String(r.errors[0].message).includes("boom"));
}

t.done("ekko:web/graphql covered");
