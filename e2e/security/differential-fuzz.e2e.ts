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
import { base64, utf8 } from "ekko:text/encoding";
import { Regex } from "ekko:text/regex";
import { asserter } from "../_harness.ts";

const t = asserter();
const N = 2000; 
let _s = 0x51ed >>> 0;
const rnd = () => { _s ^= _s << 13; _s ^= _s >>> 17; _s ^= _s << 5; _s >>>= 0; return _s; };
const ri = (n: number) => rnd() % n;
const pick = <T>(a: T[]): T => a[ri(a.length)];

const rstr = () => { const c = "abc XYZ012\"\\\n\t/éÿ{}[]"; let s = ""; const n = ri(8); for (let i = 0; i < n; i++) s += c[ri(c.length)]; return s; };
const genScalar = (): any => { const k = ri(6); return k === 0 ? ri(100000) - 50000 : k === 1 ? ri(100000) / 1000 : k === 2 ? rstr() : k === 3 ? true : k === 4 ? false : null; };
const genJson = (d: number): any => { if (d <= 0) return genScalar(); const k = ri(7); if (k < 2) { const o: any = {}; const n = ri(5); for (let i = 0; i < n; i++) o["k" + ri(20)] = genJson(d - 1); return o; } if (k < 4) { const a: any[] = []; const n = ri(5); for (let i = 0; i < n; i++) a.push(genJson(d - 1)); return a; } return genScalar(); };
const reconDotnet = (bytes: Uint8Array): any => { const rd: any = json.createReader(bytes); let root: any, haveRoot = false; const stack: any[] = []; let key: string | null = null; const attach = (v: any) => { if (!haveRoot && !stack.length) { root = v; haveRoot = true; return; } const top = stack[stack.length - 1]; if (Array.isArray(top)) top.push(v); else top[key as string] = v; }; let tok: any; while ((tok = rd.read()) !== null) { const tt = tok.tokenType; if (tt === "startObject") { const o = {}; attach(o); stack.push(o); } else if (tt === "startArray") { const a: any[] = []; attach(a); stack.push(a); } else if (tt === "endObject" || tt === "endArray") stack.pop(); else if (tt === "propertyName") key = tok.value; else if (tt === "string") attach(tok.value); else if (tt === "number") attach(parseFloat(tok.value)); else if (tt === "true") attach(true); else if (tt === "false") attach(false); else if (tt === "null") attach(null); } rd.close(); return root; };
const deepEq = (a: any, b: any): boolean => { if (a === b) return true; if (typeof a !== typeof b) return false; if (a && b && typeof a === "object") { if (Array.isArray(a) !== Array.isArray(b)) return false; const ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return false; for (const k of ka) if (!deepEq(a[k], b[k])) return false; return true; } return false; };

const B64C = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const refB64 = (buf: Uint8Array): string => { let r = ""; for (let i = 0; i < buf.length; i += 3) { const a = buf[i], b = buf[i + 1], c = buf[i + 2]; r += B64C[a >> 2] + B64C[((a & 3) << 4) | ((b ?? 0) >> 4)] + ((i + 1 < buf.length) ? B64C[(((b ?? 0) & 15) << 2) | ((c ?? 0) >> 6)] : "=") + ((i + 2 < buf.length) ? B64C[(c ?? 0) & 63] : "="); } return r; };

const RILIT = "abcABC012 _-".split("");
const escLit = (ch: string) => (".^$*+?()[]{}|\\".indexOf(ch) >= 0 ? "\\" + ch : ch);
const genAtom = (): string => { const k = ri(6); return k === 0 ? escLit(pick(RILIT)) : k === 1 ? "[" + (ri(2) ? "^" : "") + pick(["a-z", "A-Z", "0-9", "abc", "a-c0-3"]) + "]" : k === 2 ? "." : k === 3 ? "\\" + pick(["d", "w", "s", "D", "W", "S"]) : k === 4 ? "(" + genSeq(1) + ")" : escLit(pick(RILIT)) + "|" + escLit(pick(RILIT)); };
const quant = (): string => { const k = ri(5); return k === 0 ? "*" : k === 1 ? "+" : k === 2 ? "?" : k === 3 ? "{" + ri(4) + "}" : "{" + ri(3) + "," + (ri(3) + ri(3)) + "}"; };
const genSeq = (depth: number): string => { let p = ""; const n = ri(4) + 1; for (let i = 0; i < n; i++) { let a = (depth > 0 && ri(4) === 0) ? "(" + genSeq(depth - 1) + ")" : genAtom(); if (ri(2)) a += quant(); p += a; } return p; };
const genPattern = () => { let p = genSeq(1); if (ri(3) === 0) p = "^" + p; if (ri(3) === 0) p += "$"; return p; };
const ASCII = "abcABC012 _-.xyz";
const genInput = () => { let s = ""; const n = ri(12); for (let i = 0; i < n; i++) s += ASCII[ri(ASCII.length)]; return s; };

t.group("differential fuzz — two impls agree on valid inputs (0 divergences)");
let jd = 0; for (let i = 0; i < N; i++) { const v = genJson(3); let s: string; try { s = json.stringify(v); } catch { continue; } if (s == null) continue; let a: any; try { a = json.parse(s); } catch { continue; } try { if (!deepEq(a, reconDotnet(utf8.encode(s)))) jd++; } catch { jd++; } }
t.eq(`json: V8 parse ≡ .NET reader over ${N} values`, jd, 0);

let bd = 0; for (let i = 0; i < N; i++) { const n = ri(48); const buf = new Uint8Array(n); for (let j = 0; j < n; j++) buf[j] = ri(256); let enc: string; try { enc = base64.encode(buf); } catch { bd++; continue; } const ref = refB64(buf); if (enc !== ref) { bd++; continue; } try { if (Array.from(base64.decode(ref)).join(",") !== Array.from(buf).join(",")) bd++; } catch { bd++; } }
t.eq(`base64: .NET ≡ canonical + round-trip over ${N} buffers`, bd, 0);

let rd2 = 0, rc = 0; for (let i = 0; i < N; i++) { const p = genPattern(); let rn: any, rv: RegExp; try { rn = Regex(p); } catch { continue; } try { rv = new RegExp(p); } catch { continue; } if (!rn || !rn.test) continue; const inp = genInput(); let a: boolean, b: boolean; try { a = !!rn.test(inp); } catch { continue; } try { b = rv.test(inp); } catch { continue; } rc++; if (a !== b) rd2++; }
t.eq(`regex: .NET ≡ V8 on ${rc} common-subset patterns`, rd2, 0);
t.check("reached end → no input aborted the process", true);
t.done("differential fuzz (W1.3)");
