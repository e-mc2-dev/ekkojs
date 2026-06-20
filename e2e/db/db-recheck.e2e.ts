// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { Database } from "ekko:db";
import { exists, remove } from "ekko:fs";
import { asserter } from "../_harness";

const t = asserter();
function rm(p: string) { for (const s of [p, p + "-wal", p + "-shm"]) { try { if (exists(s)) remove(s); } catch {  } } }
const DBP = "e2e/_dbtmp/recheck.db";
rm(DBP);
const db = new Database(DBP);
const scalar = (r: any) => (r.rows.length ? r.rows[0][0] : undefined);

t.group("control-char TEXT round-trip (escape_json regression)");
db.exec("CREATE TABLE tc (id INTEGER PRIMARY KEY, v TEXT)");
const insV = db.prepare("INSERT INTO tc (v) VALUES (@v)");
const back = (id: number) => scalar(db.query("SELECT v FROM tc WHERE id=@id", { id }));

let cc = 0;
for (let code = 1; code <= 0x1f; code++) {
  const s = "a" + String.fromCharCode(code) + "b";
  insV.exec({ v: s });
  cc++;
  if (back(cc) === s) {  }
}

let allCtrlOk = true;
for (let code = 1; code <= 0x1f; code++) {
  const s = "a" + String.fromCharCode(code) + "b";
  if (back(code) !== s) allCtrlOk = false;
}
t.check("all 0x01..0x1f control chars round-trip", allCtrlOk);

insV.exec({ v: "x\bx" }); t.eq("backspace \\b round-trip", back(cc + 1), "x\bx"); cc++;
insV.exec({ v: "x\fx" }); t.eq("form-feed \\f round-trip", back(cc + 1), "x\fx"); cc++;
insV.exec({ v: "x\x0bx" }); t.eq("vtab \\x0b round-trip", back(cc + 1), "x\x0bx"); cc++;
insV.close();

t.notThrows("SELECT char(8),char(12),char(1) no throw", () => db.query("SELECT char(8) a, char(12) b, char(1) c"));
t.eq("char(8) length 1", db.query("SELECT char(8) a").rows[0][0].length, 1);
t.eq("char(8) is backspace", db.query("SELECT char(8) a").rows[0][0].charCodeAt(0), 8);

db.exec("INSERT INTO tc (id,v) VALUES (200, @v)", { v: 'q"\\\n\r\t/end' });
t.eq("quote/backslash/nl/cr/tab/slash round-trip", back(200), 'q"\\\n\r\t/end');

t.group("float edges — Inf/NaN → null, precision");
t.notThrows("SELECT 9e999 (Inf) no throw", () => db.query("SELECT 9e999"));
t.eq("Inf serializes as null", scalar(db.query("SELECT 9e999")), null);
t.eq("-Inf serializes as null", scalar(db.query("SELECT -9e999")), null);
t.notThrows("NaN expr no throw", () => db.query("SELECT 9e999 - 9e999"));
t.eq("NaN serializes as null", scalar(db.query("SELECT 9e999 - 9e999")), null);
t.eq("finite large real preserved", scalar(db.query("SELECT 1.7976931348623157e308")), 1.7976931348623157e308);
t.eq("small real precision", scalar(db.query("SELECT 0.1 + 0.2")), 0.1 + 0.2);
t.eq("negative real", scalar(db.query("SELECT -3.5")), -3.5);
t.eq("integer stays integer", scalar(db.query("SELECT 9007199254740991")), 9007199254740991);

t.group("unicode TEXT fidelity");
db.exec("CREATE TABLE u (id INTEGER PRIMARY KEY, v TEXT)");
const uvals = ["😀🎉", "日本語テスト", "café — naïve", "é", "‮rtl‬", "Ω≈ç√∫", "𝕳𝖊𝖑𝖑𝖔"];
const ui = db.prepare("INSERT INTO u (v) VALUES (@v)");
uvals.forEach((v) => ui.exec({ v }));
ui.close();
uvals.forEach((v, i) => t.eq("unicode round-trip: " + v.slice(0, 6), scalar(db.query("SELECT v FROM u WHERE id=@id", { id: i + 1 })), v));
t.eq("unicode length preserved (emoji)", scalar(db.query("SELECT length(v) FROM u WHERE id=1")), 2);

t.eq("unicode column alias", db.query("SELECT 1 AS 'café'").columns[0], "café");

t.group("NULL vs empty-string vs blob");
db.exec("CREATE TABLE ne (id INT, v)");
db.exec("INSERT INTO ne VALUES (1, NULL), (2, ''), (3, x'cafe')");
t.eq("NULL is null", scalar(db.query("SELECT v FROM ne WHERE id=1")), null);
t.eq("empty string is ''", scalar(db.query("SELECT v FROM ne WHERE id=2")), "");
t.ne("null !== empty", scalar(db.query("SELECT v FROM ne WHERE id=1")), scalar(db.query("SELECT v FROM ne WHERE id=2")));
t.eq("blob → null", scalar(db.query("SELECT v FROM ne WHERE id=3")), null);
t.eq("typeof empty is string", typeof scalar(db.query("SELECT v FROM ne WHERE id=2")), "string");

t.group("large text + bulk rows");
const big = "x".repeat(1024 * 1024); 
db.exec("CREATE TABLE big (v TEXT)");
db.exec("INSERT INTO big VALUES (@v)", { v: big });
t.eq("1MB text length preserved", scalar(db.query("SELECT length(v) FROM big")), 1024 * 1024);
t.eq("1MB text content intact", scalar(db.query("SELECT v FROM big")).length, big.length);
db.exec("CREATE TABLE bulk (id INTEGER PRIMARY KEY, n INT)");
db.exec("BEGIN");
const bi = db.prepare("INSERT INTO bulk (n) VALUES (@n)");
for (let i = 0; i < 10000; i++) bi.exec({ n: i });
bi.close();
db.exec("COMMIT");
t.eq("10k rows inserted", scalar(db.query("SELECT count(*) FROM bulk")), 10000);
t.eq("10k sum correct", scalar(db.query("SELECT sum(n) FROM bulk")), (9999 * 10000) / 2);
t.eq("bulk query returns all", db.query("SELECT n FROM bulk").rows.length, 10000);

t.group("multi-statement batch + prepared-stmt reuse");
db.exec("CREATE TABLE b2 (id INT)");
db.exec("INSERT INTO b2 VALUES (1); INSERT INTO b2 VALUES (2); INSERT INTO b2 VALUES (3);");
t.eq("batch executed all statements", scalar(db.query("SELECT count(*) FROM b2")), 3);
const rs = db.prepare("SELECT n FROM bulk WHERE id=@id");
let reuseOk = true;
for (let i = 1; i <= 100; i++) { if (scalar(rs.query({ id: i })) !== i - 1) reuseOk = false; }
rs.close();
t.check("prepared stmt stable across 100 reuses", reuseOk);

db.close();
rm(DBP);
t.done("ekko:db recheck");
