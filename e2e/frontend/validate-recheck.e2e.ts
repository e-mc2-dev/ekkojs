// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { z } from "ekko:web/validate";
import { asserter } from "../_harness.ts";

const t = asserter();
const ok = (r: any) => r.success === true;
const bad = (r: any) => r.success === false;

t.group("chained modifiers preserve sub-schema");
{
  const s = z.array(z.number()).min(1).max(3).optional();
  t.check("min..max..optional accepts [1,2]", ok(s.safeParse([1, 2])));
  t.check("rejects [] (min 1)", bad(s.safeParse([])));
  t.check("rejects [1,2,3,4] (max 3)", bad(s.safeParse([1, 2, 3, 4])));
  t.check("allows undefined (optional)", ok(s.safeParse(undefined)));
  t.check("still rejects bad item", bad(s.safeParse(["x"])));
}
{
  const s = z.object({ a: z.number() }).nullable().default({ a: 0 });
  t.check("object nullable accepts null", ok(s.safeParse(null)));
  const d = s.safeParse(undefined);
  t.check("default applied on undefined", ok(d));
  t.deep("default value", d.data, { a: 0 });
}
{
  const s = z.enum(["x", "y"]).optional().default("x");
  const d = s.safeParse(undefined);
  t.eq("enum default applied", d.data, "x");
  t.check("enum still validates member", ok(s.safeParse("y")));
  t.check("enum still rejects non-member", bad(s.safeParse("z")));
}

t.group("nested composites + per-item paths");
{
  const s = z.array(z.object({ id: z.string(), n: z.number() }));
  const r = s.safeParse([{ id: "a", n: 1 }, { id: "b", n: "bad" }]);
  t.check("invalid", bad(r));
  t.eq("path points to item field", r.error.issues[0].path.join("."), "1.n");
}
{
  const s = z.union([z.object({ kind: z.literal("a"), v: z.number() }), z.object({ kind: z.literal("b"), v: z.string() })]);
  t.check("union object branch a", ok(s.safeParse({ kind: "a", v: 1 })));
  t.check("union object branch b", ok(s.safeParse({ kind: "b", v: "s" })));
  t.check("union no branch", bad(s.safeParse({ kind: "a", v: "wrong-type" })));
}
{
  const s = z.record(z.object({ active: z.boolean() }));
  t.check("record of objects valid", ok(s.safeParse({ x: { active: true }, y: { active: false } })));
  t.check("record of objects rejects bad value", bad(s.safeParse({ x: { active: "yes" } })));
}

t.group("min/max distinct across types");
t.check("number min(10) rejects 5", bad(z.number().min(10).safeParse(5)));
t.check("number max(10) accepts 5", ok(z.number().max(10).safeParse(5)));
t.check("string min(3) rejects 'ab'", bad(z.string().min(3).safeParse("ab")));
t.check("array min(2) rejects [1]", bad(z.array(z.number()).min(2).safeParse([1])));
t.check("array max(2) accepts [1]", ok(z.array(z.number()).max(2).safeParse([1])));

t.group("nullable + optional combos + default precedence");
t.check("optional+nullable accepts undefined", ok(z.string().optional().nullable().safeParse(undefined)));
t.check("optional+nullable accepts null", ok(z.string().optional().nullable().safeParse(null)));
t.check("optional+nullable accepts value", ok(z.string().optional().nullable().safeParse("v")));
{
  const d = z.number().default(7).safeParse(undefined);
  t.eq("default precedence over optional-undefined", d.data, 7);
}

t.group("trim ordering");
{
  
  const s = z.string().trim().min(2);
  const r = s.safeParse("  a  ");
  t.check("trim-then-min rejects trimmed-too-short", bad(r));
  t.check("trim-then-min accepts trimmed-ok", ok(z.string().trim().min(2).safeParse("  abc  ")));
}

t.done("ekko:web/validate recheck");
