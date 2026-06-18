// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { cron } from "ekko:job/cron";
import { createGraphQL } from "ekko:web/graphql";
import { z } from "ekko:web/validate";
import { createAuth } from "ekko:auth";
import { base64, hex } from "ekko:text/encoding";
import { Regex } from "ekko:text/regex";
import { asserter } from "../_harness";

const t = asserter();
const N = 1500; 

let _s = 0x1234567 >>> 0;
const rnd = () => { _s ^= _s << 13; _s ^= _s >>> 17; _s ^= _s << 5; _s >>>= 0; return _s; };
const ri = (n: number) => rnd() % n;
const pick = <T>(a: T[]): T => a[ri(a.length)];
const randStr = (alpha: string, maxLen: number) => { let s = ""; const n = ri(maxLen) + 1; for (let i = 0; i < n; i++) s += alpha[ri(alpha.length)]; return s; };
const randUni = (maxLen: number) => { let s = ""; const n = ri(maxLen) + 1; for (let i = 0; i < n; i++) s += String.fromCharCode(ri(0x2000)); return s; };
const mutate = (seed: string) => { const a = seed.split(""); const ops = ri(4) + 1; for (let i = 0; i < ops; i++) { const k = ri(3); const p = ri(a.length + 1); if (k === 0 && a.length) a.splice(ri(a.length), 1); else if (k === 1) a.splice(p, 0, String.fromCharCode(ri(0x100))); else if (a.length) a[ri(a.length)] = String.fromCharCode(ri(0x100)); } return a.join(""); };

const auth = createAuth({ secret: "fuzz" });
const ALPHAS = ["0123456789*/,-? \tLW#", "()[]{}.*+?|\\^$-azAZ09 \t\n", "A-Za-z0-9+/=-_ \n", "0123456789abcdefABCDEF xyz", " {}()[]:!,.\"#abc\ntype query fragment on ...", "eyJ.-_0123456789abcXYZ", " \t\n\0\"'\\{}[]()<>:;,.0aZ"];
const gen = () => { const m = ri(3); return m === 0 ? randStr(pick(ALPHAS), 80) : m === 1 ? randUni(48) : randStr(" \t\n\0\"'\\{}[]()<>:;,.0aZ", 200); };

function fuzz(label: string, seeds: string[], run: (s: string) => void) {
  let survived = 0;
  for (let i = 0; i < N; i++) { const inp = (i & 1) ? mutate(pick(seeds)) : gen(); try { run(inp); } catch {  } survived++; }
  t.eq(`${label}: ${N} fuzzy inputs, none crashed`, survived, N);
}

t.group("JS-stdlib parser fuzz — throws-or-valid, never crash");
fuzz("cron", ["* * * * *", "*/5 1-3 * * 1,3"], (s) => { cron.schedule("z", s, () => {}); cron.remove("z"); });
fuzz("regex", ["(a|b)+", "[a-z]{2,5}", "^\\d+$"], (s) => { const r: any = Regex(s); if (r && r.test) r.test("Sample-123"); });
fuzz("base64", ["aGVsbG8=", "AAAA"], (s) => { base64.decode(s); });
fuzz("hex", ["deadbeef", "00ff"], (s) => { hex.decode(s); });
fuzz("jwt", [auth.jwt.sign({ sub: "u" }, 3600), "a.b.c"], (s) => { auth.jwt.verify(s); });
fuzz("graphql-sdl", ["type Query { a: Int }"], (s) => { createGraphQL({ schema: s, resolvers: {} }); });
const gq: any = createGraphQL({ schema: "type Query { a: Int me: User } type User { id: ID }", resolvers: {} });
fuzz("graphql-query", ["{ a }", "query { me { id } }"], (s) => { gq.execute(s, {}, {}); });
fuzz("validate", ["{}", '{"a":1}', "[1,2,3]"], (s) => { const sch = z.object({ a: z.number().optional(), c: z.array(z.number()).optional() }); let v: any; try { v = JSON.parse(s); } catch { v = s; } sch.safeParse(v); });

t.check("reached end → no input aborted the process", true);
t.done("JS-stdlib parser fuzz (W1.2)");
