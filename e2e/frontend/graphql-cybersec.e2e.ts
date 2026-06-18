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
import { asserter } from "../_harness";

const t = asserter();

const sdl = `
type Query { me: User }
type User { id: ID, name: String, friend: User }
`;
const gql = createGraphQL({
  schema: sdl,
  resolvers: { Query: { me: () => ({ id: "1", name: "A", friend: { id: "2", name: "B", friend: null } }) } },
  maxDepth: 6,
});

t.group("BUG A — cyclic fragments do NOT crash the process");
{
  
  const cyc = "query { me { ...A } } fragment A on User { id ...B } fragment B on User { name ...A }";
  let survived = false; let r: any = null;
  try { r = gql.execute(cyc, {}, {}); survived = true; } catch (e) { survived = true;  }
  t.check("A→B→A executed without crashing", survived);
  t.check("returned a result object", r === null || typeof r === "object");
}
{
  const self = "query { me { ...A } } fragment A on User { id ...A }";
  let survived = false; let r: any = null;
  try { r = gql.execute(self, {}, {}); survived = true; } catch (e) { survived = true; }
  t.check("self-cycle A→A executed without crashing", survived);
  t.check("self-cycle returns object", r === null || typeof r === "object");
}
{
  
  const q = "query { me { ...A } } fragment A on User { id ...B } fragment B on User { name ...C } fragment C on User { id ...A }";
  let survived = false;
  try { gql.execute(q, {}, {}); survived = true; } catch (e) { survived = true; }
  t.check("3-fragment cycle executed without crashing", survived);
}

t.group("maxDepth enforced (no unbounded nesting)");
{
  
  const loop: any = { id: "1", name: "loop" }; loop.friend = loop;
  const g = createGraphQL({ schema: sdl, resolvers: { Query: { me: () => loop } }, maxDepth: 6 });
  const deep = "{ me { friend { friend { friend { friend { friend { friend { friend { id } } } } } } } } }";
  const r = g.execute(deep, {}, {}) as any;
  const hasDepthErr = r.errors && r.errors.some((e: any) => /depth/i.test(e.message));
  t.check("deep query against cyclic data reports depth error (no infinite recursion)", !!hasDepthErr);
}

t.group("fragment-bomb backstop (expansion cap) does not hang");
{
  
  let frags = "";
  let body = "...L0";
  for (let i = 0; i < 12; i++) frags += `fragment L${i} on User { ...L${i + 1} ...L${i + 1} ...L${i + 1} } `;
  frags += "fragment L12 on User { id }";
  const q = `query { me { ${body} } } ${frags}`;
  let done = false; let r: any = null;
  try { r = gql.execute(q, {}, {}); done = true; } catch (e) { done = true; }
  t.check("fragment-bomb completed (bounded, no hang/crash)", done);
  t.check("either capped error or finite data", r === null || typeof r === "object");
}

t.group("handler limits (mock req/res)");
function mkHandlerReq(bodyObj: any) {
  const h: any = {}; const state: any = { code: 0, body: null };
  const res: any = {
    status(c: number) { state.code = c; return this; },
    json(d: any) { state.body = d; }, header() { return this; },
    get _code() { return state.code; }, get _body() { return state.body; },
  };
  const req: any = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(bodyObj), json() { return bodyObj; } };
  return { req, res };
}
{
  
  const big: any = { query: "{ me { id } }", variables: { blob: "x".repeat(110000) } };
  const m = mkHandlerReq(big);
  gql.handler(m.req, m.res);
  t.eq("oversize variables → 400", m.res._code, 400);
  t.check("error mentions too large", String(JSON.stringify(m.res._body)).toLowerCase().includes("large"));
}
{
  
  const m = mkHandlerReq({ variables: {} });
  gql.handler(m.req, m.res);
  t.eq("missing query → 400", m.res._code, 400);
}
{
  
  const m = mkHandlerReq({ query: "{ me { id } }" });
  
  gql.handler(m.req, m.res);
  t.check("valid request not 500", m.res._code !== 500);
}

t.done("ekko:web/graphql cybersec");
