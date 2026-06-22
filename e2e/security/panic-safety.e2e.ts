// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { readText, writeText, exists, stat, remove } from "ekko:fs";
import { json } from "ekko:text/json";
import { asserter } from "../_harness";

const t = asserter();
const evilStr = { toString() { throw new Error("boom-toString"); } } as any;
const evilVal = { valueOf() { throw new Error("boom-valueOf"); }, toString() { throw new Error("boom-toString"); } } as any;

t.group("hostile string args do not abort the host (W2.4)");

let survived = 0;
for (const fn of [
  () => readText(evilStr),
  () => exists(evilStr),
  () => stat(evilStr),
  () => writeText(evilStr, "x"),
  () => writeText("e2e/_dbtmp/ok.txt", evilStr),
  () => remove(evilStr),
  () => readText(evilVal),
]) {
  try { fn(); } catch {  }
  survived++;
}
t.eq("7 hostile-arg calls handled without process abort", survived, 7);

t.notThrows("fs.exists works after hostile args", () => exists("e2e"));

t.group("hijacked handle method (throwing valueOf _handle) does not abort the host (W2.4)");
{

  const rd: any = json.createReader(new Uint8Array([91, 93])); 
  const evil = { _handle: { valueOf() { throw new Error("boom"); } } } as any;
  let ok = false; try { rd.read.call(evil); } catch { ok = true; }
  t.check("hijacked _handle (throwing valueOf) → caught, no abort", ok);
  
  const evilGetter: any = {}; Object.defineProperty(evilGetter, "_handle", { get() { throw new Error("boom-getter"); } });
  let ok2 = false; try { rd.read.call(evilGetter); } catch { ok2 = true; }
  t.check("hijacked _handle (throwing getter) → caught, no abort", ok2);
  rd.close();
  t.notThrows("json reader still usable after a hijack attempt", () => json.createReader(new Uint8Array([123, 125])).close());
}
t.check("reached end → no input aborted the process", true);

t.done("panic-safety: hostile args (W2.4)");
