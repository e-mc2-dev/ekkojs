// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { base64, hex, utf8 } from "ekko:text/encoding";
import { asserter } from "../_harness";

const t = asserter();

const ERR = /error|invalid|valid|format|decod|base.?64|hex|I\/O|character|padding|illegal|input|string/i;

t.group("base64.decode — malformed input throws (no crash)");
t.throws("invalid chars '!!!!'", () => base64.decode("!!!!"), ERR);
t.throws("invalid chars '@@@@'", () => base64.decode("@@@@"), ERR);
t.throws("bad padding 'Zg='", () => base64.decode("Zg="), ERR);
t.throws("wrong length 'Zg'", () => base64.decode("Zg"), ERR);
t.throws("length-1 'Z'", () => base64.decode("Z"), ERR);
t.throws("non-ASCII char 'Zé9v'", () => base64.decode("Zé9v"), ERR);
t.throws("five chars 'Zm9vY'", () => base64.decode("Zm9vY"), ERR);

t.group("base64.decodeUrl — malformed input throws");
t.throws("length-1 'A'", () => base64.decodeUrl("A"), ERR);
t.throws("invalid char '##'", () => base64.decodeUrl("##"), ERR);

t.group("hex.decode — malformed input throws");
t.throws("odd length 'abc'", () => hex.decode("abc"), ERR);
t.throws("non-hex 'xyz0'", () => hex.decode("xyz0"), ERR);
t.throws("non-hex 'gg'", () => hex.decode("gg"), ERR);
t.throws("0x-prefixed '0xff'", () => hex.decode("0xff"), ERR);
t.throws("single char 'a'", () => hex.decode("a"), ERR);
t.throws("trailing space 'ab '", () => hex.decode("ab "), ERR);

t.group("liveness — isolate not corrupted after a throw");
try { base64.decode("!!!!"); } catch {  }
t.check("base64.decode still works after throw", base64.decode("Zm9v").length === 3);
try { hex.decode("zz"); } catch {  }
t.check("hex.decode still works after throw", hex.decode("00ff").length === 2);
try { base64.decodeUrl("A"); } catch {  }
t.eq("utf8 round-trip still works after throw", utf8.decode(utf8.encode("ok")), "ok");

t.group("DoS — large input completes and round-trips");
const big = new Uint8Array(1024 * 1024);          
for (let i = 0; i < big.length; i++) big[i] = (i * 31) & 0xff;
const b64 = base64.encode(big);
t.gt("1MB base64 string produced", b64.length, 1_000_000);
t.check("1MB base64 round-trip", base64.decode(b64).length === big.length);
const hx = hex.encode(big);
t.eq("1MB hex string length == 2MB", hx.length, 2 * 1024 * 1024);
t.check("1MB hex round-trip", hex.decode(hx).length === big.length);
const bigStr = "héllo😀".repeat(100_000);          
t.eq("large unicode utf8 round-trip", utf8.decode(utf8.encode(bigStr)), bigStr);

t.done("ekko:text/encoding hardening");
