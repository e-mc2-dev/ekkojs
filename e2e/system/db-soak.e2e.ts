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
import { connect, defineTable, col } from "ekko:db/orm";
import { asserter } from "../_harness";

const t = asserter();
const E: any = (globalThis as any).Ekko;
let OPS = 1500; 
try { const v = E.env.get("EKKO_DB_SOAK_OPS"); if (v) OPS = Math.max(100, parseInt(v, 10) | 0); } catch {  }
console.log(`[db-soak] ${OPS} insert/update/query/delete cycles (scale via EKKO_DB_SOAK_OPS + duration)`);

const Items = defineTable("items", {
  id: col.int().primaryKey().autoIncrement(),
  k: col.text(),
  v: col.int(),
});
const db = connect(Database(":memory:"));
db.createTable(Items);
const heapUsed = () => E.metrics().heap.usedBytes as number;

t.group(`DB/ORM soak — integrity + bounded memory (W3.4, ${OPS} cycles)`);

let liveExpected = 0;
let integrityOk = true;
const heapStart = heapUsed();
for (let i = 0; i < OPS; i++) {
  db.from(Items).insert({ k: "key" + (i % 50), v: i }).exec();
  liveExpected++;
  
  const row: any = db.from(Items).where((x: any) => x.v.eq(i)).first();
  if (!row || row.v !== i) { integrityOk = false; }
  
  if (i % 10 === 9) {
    const victim: any = db.from(Items).where((x: any) => x.v.eq(i - 9)).first();
    if (victim) { db.from(Items).where((x: any) => x.id.eq(victim.id)).delete().exec(); liveExpected--; }
  }
}
const heapEnd = heapUsed();
const deltaMB = (heapEnd - heapStart) / 1048576;

const count = db.from(Items).count();
console.log(`[db-soak] live rows=${count} (expected ${liveExpected}); heap start=${(heapStart / 1048576).toFixed(1)}MB end=${(heapEnd / 1048576).toFixed(1)}MB delta=${deltaMB.toFixed(2)}MB`);

t.check("every point read-back matched (no corruption under churn)", integrityOk);
t.eq("row count exact after insert/delete churn (integrity)", count, liveExpected);

const liveRows: any[] = db.from(Items).toArray();
let refSum = 0; for (const r of liveRows) refSum += r.v;
t.eq("SUM(v) via ORM == recomputed reference", db.from(Items).sum("v"), refSum);
t.eq("toArray length == count", liveRows.length, count);

t.check("heap bounded across DB churn (no per-op leak)", (heapEnd - heapStart) < 24 * 1024 * 1024);
t.check("heap under V8 limit", heapEnd < E.metrics().heap.limitBytes);

db.close();
t.check("reached end — DB soak survived, clean close", true);
t.done("DB/ORM concurrency soak (W3.4 CI-budget)");
