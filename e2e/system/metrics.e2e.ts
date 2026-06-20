// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { asserter } from "../_harness";

const t = asserter();
const E: any = (globalThis as any).Ekko;

t.group("Ekko.metrics() shape + sanity");
t.type("Ekko.metrics is a function", E.metrics, "function");
const m = E.metrics();
t.type("returns an object", m, "object");

t.type("uptimeMs is a number", m.uptimeMs, "number");
t.check("uptimeMs >= 0", m.uptimeMs >= 0);
t.type("panics is a number", m.panics, "number");
t.eq("panics == 0 (no panic this run)", m.panics, 0);

t.type("heap is an object", m.heap, "object");
t.type("heap.usedBytes number", m.heap.usedBytes, "number");
t.type("heap.totalBytes number", m.heap.totalBytes, "number");
t.type("heap.limitBytes number", m.heap.limitBytes, "number");
t.check("heap.usedBytes > 0", m.heap.usedBytes > 0);
t.check("heap.usedBytes <= heap.totalBytes", m.heap.usedBytes <= m.heap.totalBytes);
t.check("heap.totalBytes <= heap.limitBytes", m.heap.totalBytes <= m.heap.limitBytes);
t.check("heap.limitBytes is large (> 16MB)", m.heap.limitBytes > 16 * 1024 * 1024);

t.group("metrics reflect live allocation + monotonic uptime");
const before = E.metrics();
const big: number[] = [];
for (let i = 0; i < 200000; i++) big.push(i);
const after = E.metrics();
t.check("used heap grew (or stayed) after allocating", after.heap.usedBytes >= before.heap.usedBytes - 1);
t.check("uptime is monotonic non-decreasing", after.uptimeMs >= before.uptimeMs);
t.check("big array built (keep ref live)", big.length === 200000);

t.done("Ekko.metrics observability (W6.3)");
