// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { dlopen, types } from "ekko:ffi";
import { asserter } from "../_harness";

const t = asserter();
const WIN = Ekko.platform === "win32";
const MAC = Ekko.platform === "darwin";
const MATH = WIN ? "msvcrt.dll" : (MAC ? "libSystem.B.dylib" : "libm.so.6");
const LIBC = WIN ? "msvcrt.dll" : (MAC ? "libSystem.B.dylib" : "libc.so.6");
const approx = (a: number, b: number) => Math.abs(a - b) < 1e-9;

t.group("types — primitive sentinels");
for (const name of ["i8","i16","i32","i64","u8","u16","u32","u64","f32","f64","bool","void","ptr","cstring","buffer"]) {
  t.eq("types." + name + "._ffi_type", (types as any)[name]?._ffi_type, name);
}

t.group("types.struct — C-ABI layout (no native call)");
const ck = (label: string, st: any, size: number, offsets: number[], align: number) => {
  t.eq(label + " _ffi_type", st._ffi_type, "struct");
  t.eq(label + " _size", st._size, size);
  t.deep(label + " _offsets", st._offsets, offsets);
  t.eq(label + " _align", st._align, align);
};
ck("{f64,f64}", types.struct({ x: types.f64, y: types.f64 }), 16, [0, 8], 8);
ck("{i8,i32}", types.struct({ a: types.i8, b: types.i32 }), 8, [0, 4], 4);
ck("{i32,i8}", types.struct({ a: types.i32, b: types.i8 }), 8, [0, 4], 4);
ck("{i8,i8,i8}", types.struct({ a: types.i8, b: types.i8, c: types.i8 }), 3, [0, 1, 2], 1);
ck("{i16,i64}", types.struct({ a: types.i16, b: types.i64 }), 16, [0, 8], 8);
ck("{f32,f32,f32}", types.struct({ x: types.f32, y: types.f32, z: types.f32 }), 12, [0, 4, 8], 4);
ck("{bool,i32}", types.struct({ a: types.bool, b: types.i32 }), 8, [0, 4], 4);
ck("{ptr,i8}", types.struct({ a: types.ptr, b: types.i8 }), 16, [0, 8], 8);
ck("{f32,f64}", types.struct({ a: types.f32, b: types.f64 }), 16, [0, 8], 8);
ck("{i64,i8}", types.struct({ a: types.i64, b: types.i8 }), 16, [0, 8], 8);
t.deep("{x,y} _fields order", (types.struct({ x: types.f64, y: types.f64 }) as any)._fields, ["x", "y"]);

t.group("integer / pointer / string calls");
const c = dlopen(LIBC, {
  abs: { args: [types.i32], returns: types.i32 },
  toupper: { args: [types.i32], returns: types.i32 },
  tolower: { args: [types.i32], returns: types.i32 },
  strlen: { args: [types.cstring], returns: types.u64 },
  malloc: { args: [types.u64], returns: types.ptr },
  free: { args: [types.ptr], returns: types.void },
}) as any;
t.eq("abs(-7)", c.abs(-7), 7);
t.eq("abs(7)", c.abs(7), 7);
t.eq("abs(0)", c.abs(0), 0);
t.type("abs returns number", c.abs(-1), "number");
t.eq("toupper(97)='A'", c.toupper(97), 65);
t.eq("toupper(65)='A'", c.toupper(65), 65);
t.eq("tolower(65)='a'", c.tolower(65), 97);
t.eq("strlen('hello')", c.strlen("hello"), 5n);
t.eq("strlen('')", c.strlen(""), 0n);
t.type("strlen returns bigint (u64)", c.strlen("x"), "bigint");
const p = c.malloc(64n);
t.type("malloc returns bigint (ptr)", p, "bigint");
t.ne("malloc nonzero", p, 0n);
t.notThrows("free(ptr)", () => c.free(p));
t.notThrows("free(null) -> null ptr", () => c.free(null));
t.notThrows("free(undefined) -> null ptr", () => c.free(undefined));

t.group("FLOAT calls (task 198 regression — were garbage)");
const m = dlopen(MATH, {
  sqrt: { args: [types.f64], returns: types.f64 },
  pow: { args: [types.f64, types.f64], returns: types.f64 },
  fabs: { args: [types.f64], returns: types.f64 },
  floor: { args: [types.f64], returns: types.f64 },
  ceil: { args: [types.f64], returns: types.f64 },
  ldexp: { args: [types.f64, types.i32], returns: types.f64 }, 
}) as any;
t.eq("sqrt(144) === 12", m.sqrt(144), 12);
t.eq("sqrt(0) === 0", m.sqrt(0), 0);
t.ok("sqrt(2) ≈ 1.4142135", approx(m.sqrt(2), Math.SQRT2));
t.eq("pow(2,10) === 1024", m.pow(2, 10), 1024);
t.eq("pow(3,2) === 9", m.pow(3, 2), 9);
t.eq("pow(5,0) === 1", m.pow(5, 0), 1);
t.ok("pow(2,0.5) ≈ sqrt2", approx(m.pow(2, 0.5), Math.SQRT2));
t.eq("fabs(-5.5) === 5.5", m.fabs(-5.5), 5.5);
t.eq("fabs(5.5) === 5.5", m.fabs(5.5), 5.5);
t.eq("floor(3.7) === 3", m.floor(3.7), 3);
t.eq("ceil(3.2) === 4", m.ceil(3.2), 4);
t.eq("ldexp(1.5,3) === 12 (mixed f64+i32)", m.ldexp(1.5, 3), 12);
t.eq("ldexp(3,2) === 12", m.ldexp(3, 2), 12);
t.type("sqrt returns number", m.sqrt(4), "number");

t.group("ctype + atoi/atof (cstring→i32 and cstring→f64)");
const c2 = dlopen(LIBC, {
  isdigit: { args: [types.i32], returns: types.i32 },
  isalpha: { args: [types.i32], returns: types.i32 },
  isupper: { args: [types.i32], returns: types.i32 },
  atoi: { args: [types.cstring], returns: types.i32 },
  atof: { args: [types.cstring], returns: types.f64 },
}) as any;
t.ok("isdigit('5') truthy", c2.isdigit(53) !== 0);
t.eq("isdigit('A') === 0", c2.isdigit(65), 0);
t.ok("isalpha('A') truthy", c2.isalpha(65) !== 0);
t.eq("isalpha('5') === 0", c2.isalpha(53), 0);
t.ok("isupper('A') truthy", c2.isupper(65) !== 0);
t.eq("isupper('a') === 0", c2.isupper(97), 0);
t.eq("atoi('42') === 42", c2.atoi("42"), 42);
t.eq("atoi('-7') === -7", c2.atoi("-7"), -7);
t.ok("atof('3.14') ≈ 3.14 (cstring->f64)", approx(c2.atof("3.14"), 3.14));
t.eq("atof('0') === 0", c2.atof("0"), 0);
t.ok("atof('2.5e3') ≈ 2500", approx(c2.atof("2.5e3"), 2500));
c2.close();

t.group("async calls (async:true → Promise)");
const ca = dlopen(LIBC, { abs: { args: [types.i32], returns: types.i32, async: true } }) as any;
const ma = dlopen(MATH, { sqrt: { args: [types.f64], returns: types.f64, async: true } }) as any;
const pr = ca.abs(-9);
t.ok("async returns a Promise", pr && typeof pr.then === "function");
t.eq("await async abs(-9)", await pr, 9);
t.eq("await async sqrt(144) === 12", await ma.sqrt(144), 12);
t.type("async result typeof number", await ca.abs(-3), "number");

t.group("proxy shape + close lifecycle");
t.type("__ffi_path is string", c.__ffi_path, "string");
t.ok("__ffi_path matches lib", String(c.__ffi_path).includes(LIBC.split(".")[0]));
t.type("symbol is a function", c.abs, "function");
t.type("close is a function", c.close, "function");
const tmp = dlopen(LIBC, { abs: { args: [types.i32], returns: types.i32 } }) as any;
tmp.close();
t.throws("call after close -> 'call context not found'", () => tmp.abs(1), /call context not found/);
t.notThrows("close() is idempotent", () => tmp.close());
m.close(); ca.close(); ma.close(); c.close();

t.group("error cases");
t.throws("dlopen missing symbol -> 'not found'", () => dlopen(LIBC, { no_such_sym_xyz: { args: [], returns: types.void } }), /not found/);
t.throws("dlopen nonexistent lib -> 'dlopen failed'", () => dlopen("definitely_not_a_lib_xyz", { f: { args: [], returns: types.void } }), /dlopen failed/);
t.throws("dlopen with 1 arg -> 'requires 2 arguments'", () => (dlopen as any)("x"), /requires 2 arguments/);
const cn = dlopen(LIBC, { strlen: { args: [types.cstring], returns: types.u64 } }) as any;
t.throws("cstring with null byte -> 'null byte'", () => cn.strlen("a\0b"), /null byte/);
cn.close();

const cs = dlopen(LIBC, { abs: { args: [types.struct({ a: types.i32 })], returns: types.i32 } }) as any;
t.throws("struct-by-value arg -> clear 'not supported' error", () => cs.abs({ a: 1 }), /struct-by-value|not supported/);
cs.close();

t.done("ekko:ffi");
