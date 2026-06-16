// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { asserter } from "../_harness.ts";

const t = asserter();

t.group("deep recursion throws RangeError, not a host crash (W2.4b)");
function r(n: number): number { return n <= 0 ? 0 : r(n - 1) + 1; }
t.throws("5M-deep direct recursion → RangeError", () => r(5_000_000), /call stack|maximum|range/i);
function a(n: number): number { return n <= 0 ? 0 : b(n - 1); }
function b(n: number): number { return n <= 0 ? 0 : a(n - 1); }
t.throws("5M-deep mutual recursion → RangeError", () => a(5_000_000), /call stack|maximum|range/i);

const rec = (n: number): number => n <= 0 ? 0 : [n].map(() => rec(n - 1))[0] + 1;
t.throws("deep recursion through Array.map → RangeError", () => rec(2_000_000), /call stack|maximum|range/i);

t.group("liveness — moderate recursion still works after the guard fires");
t.eq("shallow recursion (1000) computes", r(1000), 1000);
let x = 0; try { r(5_000_000); } catch { x = 1; }
t.eq("caught the overflow and continued", x, 1);
t.eq("recursion works again after a caught overflow", r(500), 500);
t.check("reached end → V8 RangeError guard held (no native stack overflow / host abort)", true);

t.done("V8 stack-limit (W2.4b)");
