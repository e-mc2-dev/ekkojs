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
import { asserter } from "../_harness.ts";

const t = asserter();
const D = { args: [] as any[], returns: types.void };
const LIBC = Ekko.platform === "win32" ? "msvcrt.dll" : (Ekko.platform === "darwin" ? "libSystem.B.dylib" : "libc.so.6");

let bareFfi = false;
try { dlopen(LIBC, { abs: { args: [types.i32], returns: types.i32 } }); } catch (e) {
  bareFfi = /PermissionError|access denied/.test(String((e as any)?.message ?? e));
}
if (!bareFfi) {
  console.log("");
  console.log("✗ MISCONFIGURED — ffi-bare-perm.e2e.ts needs BARE --allow=ffi (no pattern):");
  console.log("      ekko run e2e/platform/ffi-bare-perm.e2e.ts --allow=ffi");
  console.log("    (or simply: bash e2e/run-all.sh <ekko>)");
  console.log("  An external library loaded under bare ffi → you granted ffi:<stem> or ffi:unsafe.");
  console.log("ASSERTIONS 0 1");
  Ekko.exit(1);
}

t.group("bare --allow=ffi denies ALL external native libraries (no pattern = no external code)");
t.denied("external lib by name is denied", () => dlopen(LIBC, { abs: { args: [types.i32], returns: types.i32 } }));
t.denied("external lib absolute path is denied", () => dlopen(Ekko.platform === "win32" ? "C:/Windows/System32/msvcrt.dll" : "/usr/lib/libc.so.6", { f: D }));
t.denied("arbitrary lib name is denied", () => dlopen("evil_native_lib", { f: D }));

t.group("bare ffi still permits the runtime's own native: libraries (category check)");
{
  let m = "__nothrow__";
  try { dlopen("native:self", { f: D }); } catch (e) { m = String((e as any)?.message ?? e); }
  
  t.check("native:self NOT denied by bare ffi (category suffices) — got: " + m.slice(0, 45),
    m !== "__nothrow__" && !/access denied/.test(m));
}

t.done("ekko:ffi security/bare-grant");
