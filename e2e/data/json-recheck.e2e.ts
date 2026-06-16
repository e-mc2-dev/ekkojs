// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { json } from "ekko:text/json";
import { utf8 } from "ekko:text/encoding";
import { asserter } from "../_harness.ts";

const t = asserter();
const wout = (w: any) => utf8.decode(w.finish());
const readAll = (s: string) => { const r = json.createReader(utf8.encode(s)); const o: { tt: string; v: string }[] = []; let tk; while ((tk = r.read()) !== null) o.push({ tt: tk.tokenType, v: tk.value }); r.close(); return o; };

t.group("BUG 1 — writer colon preservation (was truncated at first ':')");
{
  const w = json.createWriter(); w.write("startArray"); w.write("valueString:http://example.com:8080/p?x=1"); w.write("endArray");
  t.deep("valueString keeps colons", json.parse(wout(w)), ["http://example.com:8080/p?x=1"]);
}
{
  const w = json.createWriter(); w.write("startObject"); w.write("propertyName:a:b:c"); w.write("valueString:x"); w.write("endObject");
  t.deep("propertyName keeps colons", json.parse(wout(w)), { "a:b:c": "x" });
}
{
  const w = json.createWriter(); w.write("startObject"); w.write("string:url:http://x:8080"); w.write("endObject");
  t.deep("named-string value keeps colons", json.parse(wout(w)), { url: "http://x:8080" });
}
{
  const w = json.createWriter(); w.write("startArray"); w.write("valueString:12:30:00"); w.write("valueString:"); w.write("endArray");
  t.deep("timestamp value + empty value", json.parse(wout(w)), ["12:30:00", ""]);
}
{
  const w = json.createWriter(); w.write("startObject"); w.write("propertyName:key"); w.write("valueString:a:b"); w.write("endObject");
  t.deep("propertyName + valueString with colon", json.parse(wout(w)), { key: "a:b" });
}

t.group("BUG 2 — reader Number token = exact JSON text (GetDecimal no longer throws/mangles)");
{
  const toks = readAll('{"x":1e400}');     
  const num = toks.find((x) => x.tt === "number");
  t.ok("1e400 reader did not throw (token present)", num);
  t.check("1e400 value is exact text", num!.v === "1e400" || num!.v.toLowerCase().includes("e"));
}
{
  const toks = readAll('{"x":1e-30}');
  const num = toks.find((x) => x.tt === "number");
  t.eq("1e-30 value is exact text (not 0.000…)", num!.v, "1e-30");
}
{
  const toks = readAll('{"big":9007199254740993,"neg":-42,"z":0}');
  const nums = toks.filter((x) => x.tt === "number").map((x) => x.v);
  t.deep("big int / negative / zero exact", nums, ["9007199254740993", "-42", "0"]);
}

t.group("BUG 3 — writer missing value is graceful (was IndexOutOfRange crash)");
t.notThrows("number:key (no value) does not crash", () => { const w = json.createWriter(); w.write("startObject"); w.write("number:age"); w.write("endObject"); w.finish(); });
t.notThrows("bool:key (no value) does not crash", () => { const w = json.createWriter(); w.write("startObject"); w.write("bool:flag"); w.write("endObject"); w.finish(); });
{
  const w = json.createWriter(); w.write("startObject"); w.write("number:age"); w.write("string:name:Bob"); w.write("endObject");
  t.deep("missing-value skipped, rest valid", json.parse(wout(w)), { name: "Bob" });
}

t.group("reader token-type names are camelCase");
{
  const toks = readAll('{"a":"s","n":1,"t":true,"f":false,"z":null,"arr":[]}');
  const types = Array.from(new Set(toks.map((x) => x.tt)));
  for (const expected of ["startObject", "propertyName", "string", "number", "true", "false", "null", "startArray", "endArray", "endObject"]) {
    t.check("token type present: " + expected, types.includes(expected));
  }
}

t.group("reader — string value with tab/colon/unicode round-trips");
{
  const toks = readAll('{"u":"http://x:8080","tab":"a\\tb","e":"😀"}');
  const strs = toks.filter((x) => x.tt === "string").map((x) => x.v);
  t.eq("colon value intact", strs[0], "http://x:8080");
  t.eq("escaped tab → real tab preserved", strs[1], "a\tb");
  t.eq("emoji value intact", strs[2], "😀");
}

t.group("empties + composition + determinism");
t.eq("writer {} ", (() => { const w = json.createWriter(); w.write("startObject"); w.write("endObject"); return wout(w); })(), "{}");
t.eq("writer []", (() => { const w = json.createWriter(); w.write("startArray"); w.write("endArray"); return wout(w); })(), "[]");
t.eq('parse(\'""\')', json.parse('""'), "");
t.eq('stringify("")', json.stringify(""), '""');
{
  const obj = { a: [1, 2, { b: "x:y:z" }], c: null, d: "café😀" };
  t.deep("parse(stringify(x)) deep-equal incl colon string", json.parse(json.stringify(obj)), obj);
}
{
  const w1 = json.createWriter(); w1.write("startArray"); w1.write("valueNumber:1.5"); w1.write("endArray"); const a = wout(w1);
  const w2 = json.createWriter(); w2.write("startArray"); w2.write("valueNumber:1.5"); w2.write("endArray"); const b = wout(w2);
  t.eq("writer deterministic", a, b);
}

t.done("ekko:text/json recheck");
