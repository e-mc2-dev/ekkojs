// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { dlopen, types as t } from "ekko:ffi";
import { asserter } from "../_harness.ts";

const a = asserter();
const WIN = Ekko.platform === "win32";
const MAC = Ekko.platform === "darwin";
const MATH = WIN ? "msvcrt.dll" : (MAC ? "libSystem.B.dylib" : "libm.so.6");
const LIBC = WIN ? "msvcrt.dll" : (MAC ? "libSystem.B.dylib" : "libc.so.6");

a.group("arity limits — float ≤4, total ≤16 (clean errors)");
const m5 = dlopen(MATH, { pow: { args: [t.f64, t.f64, t.f64, t.f64, t.f64], returns: t.f64 } }) as any;
a.throws("float arity 5 → clean error", () => m5.pow(1, 2, 3, 4, 5), /up to 4 arguments|float/i);
const m4 = dlopen(MATH, { pow: { args: [t.f64, t.f64, t.f64, t.f64], returns: t.f64 } }) as any;
a.eq("float arity 4 (at limit) works: pow(2,10,..)=1024", m4.pow(2, 10, 0, 0), 1024);
const a17 = dlopen(LIBC, { abs: { args: Array(17).fill(t.i32), returns: t.i32 } }) as any;
a.throws("int arity 17 → clean error", () => a17.abs(...Array(17).fill(1)), /max 16 arguments/i);
const a16 = dlopen(LIBC, { abs: { args: Array(16).fill(t.i32), returns: t.i32 } }) as any;
a.eq("int arity 16 (at limit) works: abs(5,..)=5", a16.abs(...Array(16).fill(5)), 5);

a.group("64-bit boundaries — i64/u64 via BigInt");
const LLABS = WIN ? "_abs64" : "llabs";
const ll = dlopen(LIBC, { [LLABS]: { args: [t.i64], returns: t.i64 } }) as any;
a.eq("llabs(-(2^40)) = 2^40", String(ll[LLABS](-(2n ** 40n))), "1099511627776");
a.eq("llabs(-9e18) round-trips i64", String(ll[LLABS](-9000000000000000000n)), "9000000000000000000");
const sc = dlopen(LIBC, { strlen: { args: [t.cstring], returns: t.u64 } }) as any;
a.eq("strlen('') = 0 (u64)", String(sc.strlen("")), "0");
a.eq("strlen(2000 chars) = 2000 (u64)", String(sc.strlen("x".repeat(2000))), "2000");
a.eq("strlen('abc') = 3 (non-null cstring still works)", String(sc.strlen("abc")), "3");

a.group("null cstring → C NULL (not the literal 'null')");

const fc = dlopen(LIBC, { free: { args: [t.cstring], returns: t.void } }) as any;
a.notThrows("free(null) cstring → NULL no-op", () => fc.free(null));
a.notThrows("free(undefined) cstring → NULL no-op", () => fc.free(undefined));

const fp = dlopen(LIBC, { free: { args: [t.ptr], returns: t.void } }) as any;
a.notThrows("free(null) ptr → NULL no-op", () => fp.free(null));

a.done("ekko:ffi recheck");
