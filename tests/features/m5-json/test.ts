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
const c: [string, boolean][] = [];

const obj = json.parse('{"name":"alice","age":30}');
c.push(["parse object", obj.name === "alice" && obj.age === 30]);

const arr = json.parse("[1,2,3]");
c.push(["parse array", arr.length === 3 && arr[0] === 1]);

c.push(["parse string", json.parse('"hello"') === "hello"]);
c.push(["parse number", json.parse("42") === 42]);
c.push(["parse null", json.parse("null") === null]);
c.push(["parse bool", json.parse("true") === true]);

const bytes = new Uint8Array([123, 34, 120, 34, 58, 49, 125]); 
const fromBytes = json.parseBytes(bytes);
c.push(["parseBytes", fromBytes.x === 1]);

const s = json.stringify({ hello: "world", n: 42 });
c.push(["stringify object", s.includes("hello") && s.includes("42")]);
c.push(["stringify array", json.stringify([1, 2, 3]) === "[1,2,3]"]);

const sb = json.stringifyBytes({ a: 1 });
c.push(["stringifyBytes returns Uint8Array", sb instanceof Uint8Array && sb.length > 0]);
const decoded = String.fromCharCode(...sb);
c.push(["stringifyBytes content", decoded.includes('"a"') && decoded.includes("1")]);

const data = '{"name":"bob","scores":[10,20,30],"active":true}';
const dataBytes = new Uint8Array(data.length);
for (let i = 0; i < data.length; i++) dataBytes[i] = data.charCodeAt(i);
const reader = json.createReader(dataBytes);
const tokens: string[] = [];
let tok;
while ((tok = reader.read()) !== null) {
  tokens.push(tok.tokenType);
}
reader.close();
c.push(["reader tokenizes", tokens[0] === "startObject" && tokens.includes("propertyName") && tokens.includes("endObject")]);
c.push(["reader count", tokens.length > 10]);

const writer = json.createWriter();
writer.write("startObject");
writer.write("string:name:charlie");
writer.write("number:age:25");
writer.write("endObject");
const result = writer.finish();
c.push(["writer returns bytes", result instanceof Uint8Array && result.length > 0]);
const written = String.fromCharCode(...result);
c.push(["writer valid json", written.includes("charlie") && written.includes("25")]);
const reparsed = json.parseBytes(result);
c.push(["writer roundtrip", reparsed.name === "charlie" && reparsed.age === 25]);

let p = 0, f = 0;
for (const [n, ok] of c) {
  if (ok) { p++; console.log("  PASS:", n); }
  else { f++; console.log("  FAIL:", n); }
}
console.log(`\n${p}/${p + f} passed` + (f > 0 ? ` (${f} FAILED)` : " — ALL PASS"));
