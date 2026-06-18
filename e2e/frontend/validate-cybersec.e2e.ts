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

t.group("BUG A — modifiers on composite schemas preserve the sub-schema (no crash)");
{
  let survived = false; let r: any;
  try { r = z.array(z.number()).optional().safeParse([1, 2]); survived = true; } catch (e) { survived = false; }
  t.check("array.optional() does not throw", survived);
  t.check("array.optional() validates contents", ok(r));
  t.check("array.optional() allows undefined", ok(z.array(z.number()).optional().safeParse(undefined)));
  t.check("array.optional() still rejects bad item", bad(z.array(z.number()).optional().safeParse(["x"])));
}
{
  let survived = false; let r: any;
  try { r = z.object({ a: z.number() }).optional().safeParse({ a: 1 }); survived = true; } catch (e) { survived = false; }
  t.check("object.optional() does not throw", survived);
  t.check("object.optional() validates", ok(r));
  t.check("object.optional() rejects bad", bad(z.object({ a: z.number() }).optional().safeParse({ a: "x" })));
}
{
  let survived = false;
  try { z.enum(["a", "b"]).optional().safeParse("a"); survived = true; } catch (e) { survived = false; }
  t.check("enum.optional() does not throw", survived);
  t.check("enum.optional() accepts member", ok(z.enum(["a", "b"]).optional().safeParse("b")));
  t.check("enum.optional() rejects non-member", bad(z.enum(["a", "b"]).optional().safeParse("z")));
}
{
  let survived = false;
  try { z.record(z.number()).optional().safeParse({ a: 1 }); survived = true; } catch (e) { survived = false; }
  t.check("record.optional() does not throw", survived);
  t.check("record.optional() rejects wrong value", bad(z.record(z.number()).optional().safeParse({ a: "x" })));
}
{
  t.check("literal.optional() accepts the literal", ok(z.literal(5).optional().safeParse(5)));
  t.check("literal.optional() accepts undefined", ok(z.literal(5).optional().safeParse(undefined)));
  t.check("literal.optional() rejects other", bad(z.literal(5).optional().safeParse(6)));
}

t.group("BUG B — refinements ARE enforced on composite types (no silent bypass)");
t.check("array.nonempty() rejects []", bad(z.array(z.number()).nonempty().safeParse([])));
t.check("array.nonempty() accepts [1]", ok(z.array(z.number()).nonempty().safeParse([1])));
t.check("array.min(2) rejects 1 element", bad(z.array(z.number()).min(2).safeParse([1])));
t.check("array.min(2) accepts 2", ok(z.array(z.number()).min(2).safeParse([1, 2])));
t.check("array.max(2) rejects 3 elements", bad(z.array(z.number()).max(2).safeParse([1, 2, 3])));
t.check("array.min uses length not value comparison", bad(z.array(z.string()).min(3).safeParse(["a"])));

t.group("validation cannot be bypassed by type confusion");
t.check("string where array expected → reported", bad(z.array(z.number()).safeParse("123")));
t.check("array where object expected → reported", bad(z.object({ a: z.number() }).safeParse([1, 2])));
t.check("null where non-nullable → reported", bad(z.number().safeParse(null)));
t.check("nested invalid yields path", (() => { const r = z.object({ items: z.array(z.number()) }).safeParse({ items: [1, "x"] }); return bad(r) && r.error.issues[0].path.join(".") === "items.1"; })());

t.group("z.body middleware does not 500 on optional composite field");
{
  function mk(bodyObj: any) {
    const h: any = {}; const state: any = { code: 0, body: null };
    const res: any = { status(c: number) { state.code = c; return this; }, json(d: any) { state.body = d; }, get _code() { return state.code; }, get _body() { return state.body; } };
    const req: any = { body: JSON.stringify(bodyObj), json() { return bodyObj; } };
    return { req, res };
  }
  const schema = z.object({ tags: z.array(z.string()).optional(), name: z.string() });
  const good = mk({ name: "x" }); let nx1 = false;
  let threw = false; try { z.body(schema)(good.req, good.res, () => { nx1 = true; }); } catch (e) { threw = true; }
  t.check("optional array field absent → no throw", !threw);
  t.check("valid body calls next", nx1);
  const bad1 = mk({ name: 123 }); let nx2 = false;
  z.body(schema)(bad1.req, bad1.res, () => { nx2 = true; });
  t.eq("invalid body → 400", bad1.res._code, 400);
  t.check("invalid body does not call next", !nx2);
}

t.done("ekko:web/validate cybersec");
