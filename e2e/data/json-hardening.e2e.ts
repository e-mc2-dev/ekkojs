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
const INVALID = /invalid|JSON|error|I\/O|parse|serialize/i;

t.group("parse — malformed input throws (no crash)");
t.throws("trailing comma", () => json.parse('{"a":1,}'), INVALID);
t.throws("unclosed object", () => json.parse('{"a":1'), INVALID);
t.throws("unclosed array", () => json.parse("[1,2"), INVALID);
t.throws("NaN literal", () => json.parse("NaN"), INVALID);
t.throws("Infinity literal", () => json.parse("Infinity"), INVALID);
t.throws("bare word", () => json.parse("garbage"), INVALID);
t.throws("single brace", () => json.parse("{"), INVALID);
t.throws("empty string", () => json.parse(""), INVALID);
t.throws("comment (not JSON)", () => json.parse("// x"), INVALID);

t.group("parseBytes — invalid UTF-8 / malformed throws");
t.throws("invalid UTF-8 bytes", () => json.parseBytes(new Uint8Array([0xff, 0xfe, 0x22])), /UTF-8|invalid/i);
t.throws("malformed JSON bytes", () => json.parseBytes(utf8.encode("{bad}")), INVALID);

t.group("stringify — unserializable throws");
t.throws("bigint", () => json.stringify(10n), INVALID);
const circ: any = {}; circ.self = circ;
t.throws("circular reference", () => json.stringify(circ), INVALID);

t.group("parse liveness — valid parse still works after a throw");
try { json.parse("garbage"); } catch {  }
t.deep("parse works after throw", json.parse('{"ok":1}'), { ok: 1 });

t.group("reader — invalid input throws / stays usable");
t.throws("reader over garbage", () => { const r = json.createReader(utf8.encode("not json")); try { r.read(); } finally { r.close(); } }, INVALID);
t.notThrows("reader truncated → partial then EOF (no crash)", () => {
  const r = json.createReader(utf8.encode('{"a":'));
  let tk; let n = 0; while ((tk = r.read()) !== null) { n++; if (n > 100) break; }
  r.close();
});
t.throws("read after close throws (no crash)", () => { const r = json.createReader(utf8.encode("{}")); r.close(); r.read(); }, /handle|error|closed/i);
t.notThrows("double close no crash", () => { const r = json.createReader(utf8.encode("{}")); r.close(); r.close(); });
t.notThrows("reader liveness — new reader works after a throw", () => {
  try { const bad = json.createReader(utf8.encode("@@@")); bad.read(); bad.close(); } catch {  }
  const r = json.createReader(utf8.encode('{"x":1}')); const tk = r.read(); r.close();
  if (tk?.tokenType !== "startObject") throw new Error("reader broken after throw");
});

t.group("reader — deep nesting rejected cleanly (Utf8JsonReader depth limit)");
t.throws("depth 200 array rejected (no crash)", () => {
  const deep = "[".repeat(200) + "]".repeat(200);
  const r = json.createReader(utf8.encode(deep));
  try { let tk; while ((tk = r.read()) !== null) {  } } finally { r.close(); }
}, INVALID);

t.group("writer — bad input throws / invalid state contained (no crash)");
t.throws("valueNumber non-numeric throws", () => { const w = json.createWriter(); w.write("startArray"); w.write("valueNumber:notanumber"); w.write("endArray"); w.finish(); }, INVALID);
t.throws("endObject without startObject throws", () => { const w = json.createWriter(); w.write("endObject"); w.finish(); }, INVALID);
t.notThrows("writer liveness — new writer works after a throw", () => {
  try { const bad = json.createWriter(); bad.write("endObject"); bad.finish(); } catch {  }
  const w = json.createWriter(); w.write("startArray"); w.write("valueNumber:1"); w.write("endArray"); w.finish();
});

t.group("parse — moderate nesting completes (safe depth; extreme-depth DoS = task 217)");
t.notThrows("parse depth 200 no crash", () => json.parse("[".repeat(200) + "1" + "]".repeat(200)));

t.done("ekko:text/json hardening");
