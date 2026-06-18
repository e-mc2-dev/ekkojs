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
const D = { args: [] as any[], returns: types.void };

let scoped = false;
try { dlopen("e2eforbidden", { f: D }); } catch (e) { scoped = /PermissionError|access denied/.test(String((e as any)?.message ?? e)); }
if (!scoped) {
  console.log("");
  console.log("✗ MISCONFIGURED — ffi-permissions.e2e.ts needs the SCOPED grant, not broad ffi:");
  console.log("      ekko run e2e/platform/ffi-permissions.e2e.ts --allow=ffi:e2eallowed");
  console.log("    (or simply: bash e2e/run-all.sh <ekko>)");
  console.log("  A forbidden library stem was ALLOWED → you granted ffi:unsafe / ffi:all.");
  console.log("ASSERTIONS 0 1");
  Ekko.exit(1);
}

t.group("allowlist denies non-matching libraries (load is gated BEFORE the OS load)");
t.denied("dlopen non-matching stem 'e2eforbidden'", () => dlopen("e2eforbidden", { f: D }));
t.denied("dlopen non-matching stem 'libcrypto'", () => dlopen("libcrypto", { f: D }));
t.denied("dlopen absolute path /tmp/evil.so (stem 'evil')", () => dlopen("/tmp/evil.so", { f: D }));
t.denied("dlopen system lib by name 'msvcrt'/'libc'", () => dlopen(Ekko.platform === "win32" ? "msvcrt.dll" : "libc.so.6", { f: D }));

t.group("allowed stem passes the permission gate (then fails to LOAD, not a PermissionError)");

const notPerm = (fn: () => void) => {
  let m = "__nothrow__";
  try { fn(); } catch (e) { m = String((e as any)?.message ?? e); }
  t.check("allowed stem reaches load (not a PermissionError) — got: " + m.slice(0, 40),
    m !== "__nothrow__" && !/PermissionError|access denied/.test(m));
};
notPerm(() => dlopen("e2eallowed", { f: D }));
notPerm(() => dlopen("/some/dir/e2eallowed.so", { f: D })); 
notPerm(() => dlopen("./e2eallowed", { f: D }));

t.group("native: paths need only the ffi CATEGORY (not the allowlist)");

{
  let m = "__nothrow__";
  try { dlopen("native:self", { f: D }); } catch (e) { m = String((e as any)?.message ?? e); }
  t.check("native:self not denied by allowlist (category suffices) — got: " + m.slice(0, 45),
    m !== "__nothrow__" && !/access denied/.test(m));
}

t.group("argument guard fires regardless of permission");
t.throws("dlopen with 1 arg -> 'requires 2 arguments'", () => (dlopen as any)("e2eallowed"), /requires 2 arguments/);

t.done("ekko:ffi security/allowlist");
