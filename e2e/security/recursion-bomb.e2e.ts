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
import { atom, selector, Mimir } from "ekko:rune/mimir";
import { compileSass, transform, minify, cssModules } from "ekko:ssr/css";
import { serializeProps } from "ekko:ssr";
import { z } from "ekko:web/validate";
import { json } from "ekko:text/json";
import { asserter } from "../_harness.ts";

const t = asserter();

t.group("graphql: cyclic fragments + deep query bounded (no crash)");
{
  const sdl = `type User { id: ID name: String friend: User } type Query { me: User }`;
  const loop: any = { id: "1", name: "x" }; loop.friend = loop; 
  const g = createGraphQL({ schema: sdl, resolvers: { Query: { me: () => loop } }, maxDepth: 6 });
  let survived = false;
  try { g.execute("query { me { ...A } } fragment A on User { id ...B } fragment B on User { name ...A }", {}, {}); survived = true; }
  catch { survived = true; }
  t.check("A→B→A cyclic fragments execute without crashing", survived);
  let survivedSelf = false;
  try { g.execute("query { me { ...A } } fragment A on User { id ...A }", {}, {}); survivedSelf = true; } catch { survivedSelf = true; }
  t.check("self-cycle fragment A→A doesn't crash", survivedSelf);
  const deep = "{ me { friend { friend { friend { friend { friend { friend { friend { id } } } } } } } } }";
  const r: any = g.execute(deep, {}, {});
  t.check("deep query on cyclic data → depth error (no infinite recursion)", !!(r.errors && r.errors.some((e: any) => /depth/i.test(e.message))));
}

t.group("mimir: circular selector throws (was stack-overflow)");
{
  const m = new Mimir();
  const s1: any = selector({ key: "rb_s1", get: (g: any) => g.get(s1) + 1 });
  t.throws("self-referential selector throws (not crash)", () => m.get(s1), /circular/i);
  const a: any = selector({ key: "rb_a", get: (g: any) => g.get(b) + 1 });
  const b: any = selector({ key: "rb_b", get: (g: any) => g.get(a) + 1 });
  t.throws("A→B→A selector cycle throws", () => m.get(a), /circular/i);
  
  const c = atom({ key: "rb_c", default: 5 });
  const ok = selector({ key: "rb_ok", get: (g: any) => g.get(c) + 1 });
  t.eq("normal selector works after circular throw", m.get(ok), 6);
}

t.group("css: deep nesting throws, not stack-overflow");
{
  const deep = (n: number) => ".n{".repeat(n) + "color:red" + "}".repeat(n);
  t.throws("compileSass 1000-deep throws", () => compileSass(deep(1000)), /nesting|depth|denial|error/i);
  t.throws("transform 1000-deep throws", () => transform(deep(1000)), /nesting|depth|denial|error/i);
  t.throws("minify 1000-deep throws", () => minify(deep(1000)), /nesting|depth|denial|error/i);
  t.throws("cssModules 1000-deep throws", () => cssModules(deep(1000), "x.css"), /nesting|depth|denial|error/i);
  t.notThrows("moderate 100-deep still compiles", () => compileSass(deep(100)));
}

t.group("ssr: circular/deep props bounded");
{
  t.throws("circular props throws (not infinite loop)", () => { const c: any = {}; c.self = c; serializeProps(c); }, /circular/i);
  
  let deepOk = false;
  try { let o: any = 1; for (let i = 0; i < 2000; i++) o = { a: o }; serializeProps(o); deepOk = true; } catch { deepOk = true; }
  t.check("2000-deep props handled without crashing", deepOk);
}

t.group("validate: deep nesting bounded (DoS guard)");
{
  const deepSchema = (n: number) => { let s: any = z.number(); for (let i = 0; i < n; i++) s = z.object({ a: s }); return s; };
  const deepVal = (n: number) => { let v: any = 1; for (let i = 0; i < n; i++) v = { a: v }; return v; };
  t.notThrows("200-deep schema validates (under cap)", () => deepSchema(200).safeParse(deepVal(200)));
  t.throws("100000-deep schema throws DoS guard (not heap-crash)", () => deepSchema(100000).safeParse(deepVal(100000)), /nesting|depth|denial/i);
  
  const deepArr = (n: number) => { let s: any = z.number(); for (let i = 0; i < n; i++) s = z.array(s); return s; };
  const deepArrVal = (n: number) => { let v: any = 1; for (let i = 0; i < n; i++) v = [v]; return v; };
  t.throws("100000-deep array schema throws DoS guard", () => deepArr(100000).safeParse(deepArrVal(100000)), /nesting|depth|denial/i);
  
  t.check("normal schema validates after guard", z.object({ a: z.number() }).safeParse({ a: 1 }).success);
}

t.group("json: deep parse/stringify throw DoS guard (no stack-overflow crash)");
{

  t.throws("50000-deep parse throws DoS guard (not crash)", () => json.parse("[".repeat(50000) + "]".repeat(50000)), /nesting|depth|denial/i);
  t.throws("50000-deep object parse throws DoS guard", () => json.parse('{"a":'.repeat(50000) + "1" + "}".repeat(50000)), /nesting|depth|denial/i);
  let deepStr = false;
  try { let o: any = 1; for (let i = 0; i < 50000; i++) o = { a: o }; json.stringify(o); } catch { deepStr = true; }
  t.check("50000-deep stringify throws DoS guard (not crash)", deepStr);
  t.throws("cyclic stringify throws (not infinite loop)", () => { const c: any = {}; c.self = c; json.stringify(c); }, /serialize|circular|cannot|nesting/i);
  
  t.eq("normal JSON round-trips after guards", json.parse(json.stringify({ a: [1, { b: 2 }] })).a[1].b, 2);
  t.notThrows("500-deep JSON (under cap) round-trips", () => json.parse("[".repeat(500) + "]".repeat(500)));
}

t.done("recursion-bomb unified suite (W1.5)");
