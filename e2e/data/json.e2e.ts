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
import { asserter } from "../_harness";

const t = asserter();
const wout = (w: any) => utf8.decode(w.finish());
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

t.group("works under default-deny");
t.notThrows("parse/stringify with no --allow", () => json.parse(json.stringify({ a: 1 })));

t.group("parse / stringify (V8 native)");
t.deep("parse object", json.parse('{"a":1,"b":[true,null]}'), { a: 1, b: [true, null] });
t.deep("parse array", json.parse('[1,"two",false,null,{"k":2}]'), [1, "two", false, null, { k: 2 }]);
t.eq("parse number", json.parse("42"), 42);
t.eq("parse string", json.parse('"hi"'), "hi");
t.eq("parse true", json.parse("true"), true);
t.eq("parse null", json.parse("null"), null);
t.deep("parse nested", json.parse('{"a":{"b":{"c":[1,2,3]}}}'), { a: { b: { c: [1, 2, 3] } } });
t.eq("parse unicode", json.parse('"caf\\u00e9 \\ud83d\\ude00"'), "café 😀");
t.eq("parse escapes", json.parse('"a\\tb\\nc\\"d\\\\e"'), 'a\tb\nc"d\\e');
t.eq("stringify object", json.stringify({ a: 1, b: "x" }), '{"a":1,"b":"x"}');
t.eq("stringify array", json.stringify([1, 2, 3]), "[1,2,3]");
t.eq("stringify nested", json.stringify({ a: [1, { b: 2 }] }), '{"a":[1,{"b":2}]}');
t.eq("stringify unicode roundtrip", json.parse(json.stringify("日本😀")), "日本😀");
t.eq("stringify NaN → null", json.stringify(NaN), "null");
t.eq("stringify Infinity → null", json.stringify(Infinity), "null");
t.eq("stringify -Infinity → null", json.stringify(-Infinity), "null");
t.eq("dup key last wins", json.stringify(json.parse('{"a":1,"a":2}')), '{"a":2}');
t.eq("round-trip identity", json.stringify(json.parse('{"x":[1,2],"y":"z"}')), '{"x":[1,2],"y":"z"}');
t.eq("stringify escapes control chars", json.parse(json.stringify("ab")), "ab");

t.group("parseBytes / stringifyBytes");
t.deep("parseBytes", json.parseBytes(utf8.encode('{"x":42,"y":[1]}')), { x: 42, y: [1] });
t.eq("stringifyBytes → string", utf8.decode(json.stringifyBytes({ a: 1 })), '{"a":1}');
t.eq("bytes round-trip", utf8.decode(json.stringifyBytes(json.parseBytes(utf8.encode('{"k":"v😀"}')))), '{"k":"v😀"}');
t.eq("parseBytes unicode", json.parseBytes(utf8.encode('{"e":"😀"}')).e, "😀");

t.group("streaming writer — array via value* commands");
{
  const w = json.createWriter();
  w.write("startArray");
  w.write("valueString:a");
  w.write("valueNumber:1.5");
  w.write("valueBool:false");
  w.write("valueBool:true");
  w.write("valueNull");
  w.write("endArray");
  t.deep("array writer output", json.parse(wout(w)), ["a", 1.5, false, true, null]);
}

t.group("streaming writer — object via named + propertyName commands");
{
  const w = json.createWriter();
  w.write("startObject");
  w.write("string:name:Alice");
  w.write("number:age:30");
  w.write("bool:active:true");
  w.write("null:mid");
  w.write("propertyName:tags");
  w.write("startArray");
  w.write("valueString:x");
  w.write("valueString:y");
  w.write("endArray");
  w.write("endObject");
  t.deep("object writer output", json.parse(wout(w)), { name: "Alice", age: 30, active: true, mid: null, tags: ["x", "y"] });
}
{
  const w = json.createWriter();
  w.write("startObject");
  w.write("endObject");
  t.eq("empty object writer", wout(w), "{}");
}

t.group("streaming reader — token sequence (camelCase)");
{
  const r = json.createReader(utf8.encode('{"k":"v","n":12.5,"b":true,"z":null,"arr":[1,2]}'));
  const toks: string[] = [];
  let tk; while ((tk = r.read()) !== null) toks.push(tk.tokenType + "=" + tk.value);
  r.close();
  t.deep("reader tokens", toks, [
    "startObject=", "propertyName=k", "string=v", "propertyName=n", "number=12.5",
    "propertyName=b", "true=true", "propertyName=z", "null=", "propertyName=arr",
    "startArray=", "number=1", "number=2", "endArray=", "endObject=",
  ]);
}
{
  const r = json.createReader(utf8.encode("[]"));
  const first = r.read(); const second = r.read(); const third = r.read();
  r.close();
  t.eq("reader [] startArray", first?.tokenType, "startArray");
  t.eq("reader [] endArray", second?.tokenType, "endArray");
  t.eq("reader [] EOF null", third, null);
}
t.notThrows("reader close idempotent-ish", () => { const r = json.createReader(utf8.encode("{}")); r.read(); r.read(); r.close(); });

t.done("ekko:text/json covered");
