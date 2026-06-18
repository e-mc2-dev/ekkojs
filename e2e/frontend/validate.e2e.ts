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
import { asserter } from "../_harness";

const t = asserter();
const ok = (r: any) => r.success === true;
const bad = (r: any) => r.success === false;

t.group("scalar types");
t.check("string accepts", ok(z.string().safeParse("hi")));
t.check("string rejects number", bad(z.string().safeParse(5)));
t.check("number accepts", ok(z.number().safeParse(3)));
t.check("number rejects NaN", bad(z.number().safeParse(NaN)));
t.check("boolean accepts", ok(z.boolean().safeParse(true)));
t.check("date accepts valid Date", ok(z.date().safeParse(new Date())));
t.check("date rejects invalid", bad(z.date().safeParse(new Date("nope"))));
t.check("any accepts anything", ok(z.any().safeParse({ whatever: 1 })));

t.group("literal + enum");
t.check("literal accepts match", ok(z.literal(5).safeParse(5)));
t.check("literal rejects mismatch", bad(z.literal(5).safeParse(6)));
t.check("enum accepts member", ok(z.enum(["a", "b"]).safeParse("a")));
t.check("enum rejects non-member", bad(z.enum(["a", "b"]).safeParse("c")));

t.group("string refinements");
t.check("min rejects short", bad(z.string().min(3).safeParse("ab")));
t.check("min accepts", ok(z.string().min(3).safeParse("abc")));
t.check("max rejects long", bad(z.string().max(2).safeParse("abc")));
t.check("email valid", ok(z.string().email().safeParse("a@b.co")));
t.check("email invalid", bad(z.string().email().safeParse("nope")));
t.check("url valid", ok(z.string().url().safeParse("https://x.io/y")));
t.check("url invalid", bad(z.string().url().safeParse("ftp://x")));
t.check("uuid valid", ok(z.string().uuid().safeParse("123e4567-e89b-12d3-a456-426614174000")));
t.check("uuid invalid", bad(z.string().uuid().safeParse("not-a-uuid")));
t.check("regex match", ok(z.string().regex(/^\d+$/).safeParse("123")));
t.check("regex no match", bad(z.string().regex(/^\d+$/).safeParse("12a")));
t.check("nonempty rejects ''", bad(z.string().nonempty().safeParse("")));

t.group("number refinements");
t.check("int accepts", ok(z.number().int().safeParse(4)));
t.check("int rejects float", bad(z.number().int().safeParse(4.5)));
t.check("positive rejects 0", bad(z.number().positive().safeParse(0)));
t.check("nonnegative accepts 0", ok(z.number().nonnegative().safeParse(0)));
t.check("number min", bad(z.number().min(10).safeParse(5)));

t.group("array / object / union / record (no modifiers)");
t.check("array of numbers", ok(z.array(z.number()).safeParse([1, 2, 3])));
t.check("array rejects wrong item", bad(z.array(z.number()).safeParse([1, "x"])));
t.check("array rejects non-array", bad(z.array(z.number()).safeParse("nope")));
{
  const r = z.object({ name: z.string(), age: z.number() }).safeParse({ name: "A", age: 30, extra: "dropped" });
  t.check("object valid", ok(r));
  t.deep("object strips unknown keys", r.data, { name: "A", age: 30 });
}
t.check("object rejects missing field", bad(z.object({ a: z.number() }).safeParse({})));
t.check("nested object", ok(z.object({ u: z.object({ id: z.string() }) }).safeParse({ u: { id: "x" } })));
t.check("union matches first", ok(z.union([z.string(), z.number()]).safeParse("s")));
t.check("union matches second", ok(z.union([z.string(), z.number()]).safeParse(7)));
t.check("union no match", bad(z.union([z.string(), z.number()]).safeParse(true)));
t.check("record of numbers", ok(z.record(z.number()).safeParse({ a: 1, b: 2 })));
t.check("record rejects wrong value", bad(z.record(z.number()).safeParse({ a: "x" })));

t.group("scalar modifiers: optional / nullable / default");
t.check("optional allows undefined", ok(z.string().optional().safeParse(undefined)));
t.check("nullable allows null", ok(z.string().nullable().safeParse(null)));
{
  const r = z.string().default("dft").safeParse(undefined);
  t.check("default success", ok(r));
  t.eq("default value applied", r.data, "dft");
}

t.group("parse vs safeParse + issues");
t.throws("parse throws on invalid", () => z.number().parse("x"), /Expected number/);
t.eq("parse returns data on valid", z.number().parse(9), 9);
{
  const r = z.object({ a: z.object({ b: z.number() }) }).safeParse({ a: { b: "x" } });
  t.check("issue has nested path", r.error.issues[0].path.join(".") === "a.b");
}

t.done("ekko:web/validate covered");
